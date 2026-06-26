import { CellCoord, coordKey, coordsEqual } from '../../types/coords'
import {
    DisplaceFigureActionParams,
    GameAction,
    GameActionType,
    FigureEventConditionType,
    FigureEventType,
} from '../../types/events'
import { FiguresSlice } from '../../state/slices'
import { cloneFigurePlacement, placementsMatch } from '../../figureView'
import { FigurePlacement, FigureId } from '../../types/figures'
import {
    findInstance,
    getTopOfStack,
    isStackOccupied,
    placementMatchesAt,
    pushToStack,
    removePlacementFromBoard,
    replaceStackAtIndex,
    resolvePlacementSnapshot,
} from '../../figureStack'
import {
    computeDisplaceLanding,
    computeWrappedDisplaceLanding,
    isDisplaceLeavingBoard,
    LeaveBoardActionContext,
    SteppedOnActionContext,
    SteppedOnQueueItem,
} from '../steppedOnQueue'
import { MoveEventContext } from '../types'
import {
    isOrientToTeamDirection,
    maybeOrientDelta,
} from '../coordinateOrientation'
import { FigureCatalog, FigureTeams } from '../../types/figures'
import { gameMovesDebugLog } from '../../gameMovesDebugLog'
import { logFigureActionApply, logFigureDisplaceDebug } from '../../figureActionsDebugLog'
import {
    buildActionSubjectResolutionContext,
    buildLeaveBoardActionSubjectContext,
    buildSteppedOnActionSubjectContext,
    resolveActionSubjects,
} from './resolveActionSubjects'

function resolveEffectiveDisplaceDeltas(
    params: DisplaceFigureActionParams,
    figureId: FigureId,
    ctx: MoveEventContext,
    figureTeams?: FigureTeams,
): { dx: number; dy: number } {
    return maybeOrientDelta(
        params.dx,
        params.dy,
        isOrientToTeamDirection(params),
        ctx.catalog,
        figureId,
        ctx.boardParameters,
        figureTeams,
    )
}

function placementMatchesOwner(placement: FigurePlacement, ownerFigureId: FigureId): boolean {
    return placement.figureId === ownerFigureId
}

function resolveOwnerDisplaceTarget(
    figures: FiguresSlice,
    ctx: MoveEventContext,
    ownerFigureId: FigureId,
): { fromCoord: CellCoord; placement: FigurePlacement } | null {
    switch (ctx.triggerConditionType) {
        case FigureEventConditionType.landedOnFigure: {
            const ownerPlacement = ctx.stepperPlacement
                && placementMatchesOwner(ctx.stepperPlacement, ownerFigureId)
                ? ctx.stepperPlacement
                : ctx.actorPlacement

            if (!placementMatchesOwner(ownerPlacement, ownerFigureId)) {
                return null
            }

            return {
                fromCoord: ctx.to,
                placement: resolvePlacementSnapshot(figures, ctx.to, ownerPlacement),
            }
        }
        case FigureEventConditionType.landedInFigureArea: {
            if (!ctx.areaSubjectCoord || !ctx.areaSubjectPlacement) {
                return null
            }

            if (!placementMatchesOwner(ctx.areaSubjectPlacement, ownerFigureId)) {
                return null
            }

            return {
                fromCoord: ctx.areaSubjectCoord,
                placement: resolvePlacementSnapshot(
                    figures,
                    ctx.areaSubjectCoord,
                    ctx.areaSubjectPlacement,
                ),
            }
        }
        case FigureEventConditionType.figureEnteredArea: {
            if (!ctx.areaAnchor) {
                return null
            }

            const stack = figures.figuresByCoord[coordKey(ctx.areaAnchor)] ?? []
            const placement = stack.find(item => placementMatchesOwner(item, ownerFigureId))

            if (!placement) {
                return null
            }

            return {
                fromCoord: ctx.areaAnchor,
                placement,
            }
        }
        default: {
            if (ctx.eventType === FigureEventType.steppedOnBy) {
                if (!ctx.targetAtTo || !placementMatchesOwner(ctx.targetAtTo, ownerFigureId)) {
                    return null
                }

                return {
                    fromCoord: ctx.to,
                    placement: resolvePlacementSnapshot(figures, ctx.to, ctx.targetAtTo),
                }
            }

            if (!placementMatchesOwner(ctx.actorPlacement, ownerFigureId)) {
                return null
            }

            return {
                fromCoord: ctx.to,
                placement: resolvePlacementSnapshot(figures, ctx.to, ctx.actorPlacement),
            }
        }
    }
}

function enqueueSteppedOnForOccupiedLanding(
    figures: FiguresSlice,
    displaced: FigurePlacement,
    fromCoord: CellCoord,
    landing: CellCoord,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const topOccupant = getTopOfStack(figures, landing)

    if (!topOccupant) {
        return figures
    }

    let nextFigures = removePlacementFromBoard(figures, displaced, fromCoord)
    nextFigures = pushToStack(nextFigures, landing, displaced)

    queue.unshift({
        stepperPlacement: cloneFigurePlacement(displaced),
        stepperCoord: landing,
        targetPlacement: cloneFigurePlacement(topOccupant),
        targetCoord: landing,
        cause: 'displacement',
    })

    return nextFigures
}

export function movePlacementToCoord(
    figures: FiguresSlice,
    placement: FigurePlacement,
    fromCoord: CellCoord,
    toCoord: CellCoord,
): FiguresSlice {
    const withoutBoard = removePlacementFromBoard(figures, placement, fromCoord)
    return pushToStack(withoutBoard, toCoord, placement)
}

export function applyDisplaceFromCoord(
    figures: FiguresSlice,
    params: DisplaceFigureActionParams,
    fromCoord: CellCoord,
    placement: FigurePlacement,
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const displaced = resolvePlacementSnapshot(figures, fromCoord, placement)
    const { dx, dy } = resolveEffectiveDisplaceDeltas(params, displaced.figureId, ctx)
    const effectiveParams = { ...params, dx, dy }
    const displaceLogDetail = {
        ownerFigureId: ctx.ownerFigureId,
        eventType: ctx.eventType,
    }

    if (isDisplaceLeavingBoard(fromCoord, effectiveParams, ctx.boardParameters)) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: fromCoord,
            to: fromCoord,
            params: effectiveParams,
            offBoard: true,
            blocked: true,
            ownerFigureId: ctx.ownerFigureId,
            eventType: ctx.eventType,
        })
        logFigureDisplaceDebug({
            context: 'applyDisplaceFromCoord',
            subject: displaced.figureId,
            from: fromCoord,
            params: effectiveParams,
            result: 'off-board',
            reason: 'landing leaves board; queued leaveBoard',
            detail: displaceLogDetail,
        })
        queue.unshift({
            kind: 'leaveBoard',
            placement: displaced,
            fromCoord,
            displaceParams: params,
        })
        return figures
    }

    const landing = computeDisplaceLanding(
        fromCoord,
        dx,
        dy,
        ctx.boardParameters,
    )
    const landingOccupied = isStackOccupied(figures, landing)
    const topOccupant = getTopOfStack(figures, landing)

    if (landingOccupied && topOccupant && topOccupant.instanceId !== displaced.instanceId) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: fromCoord,
            to: landing,
            params: effectiveParams,
            blocked: true,
            ownerFigureId: ctx.ownerFigureId,
            eventType: ctx.eventType,
        })
        logFigureDisplaceDebug({
            context: 'applyDisplaceFromCoord',
            subject: displaced.figureId,
            from: fromCoord,
            to: landing,
            params,
            result: 'blocked',
            reason: 'landing occupied; queued displacement chain',
            detail: { occupant: topOccupant.figureId, ...displaceLogDetail },
        })
        return enqueueSteppedOnForOccupiedLanding(figures, displaced, fromCoord, landing, queue)
    }

    gameMovesDebugLog.displace({
        placement: displaced,
        from: fromCoord,
        to: landing,
        params,
        ownerFigureId: ctx.ownerFigureId,
        eventType: ctx.eventType,
    })
    logFigureDisplaceDebug({
        context: 'applyDisplaceFromCoord',
        subject: displaced.figureId,
        from: fromCoord,
        to: landing,
        params,
        result: 'moved',
        detail: displaceLogDetail,
    })
    logFigureActionApply({
        context: 'applyDisplaceFromCoord',
        gameAction: { type: GameActionType.displaceFigure, params },
        subject: displaced.figureId,
        result: 'applied',
        detail: { fromCoord, landing },
    })

    return movePlacementToCoord(figures, displaced, fromCoord, landing)
}

export function applyMoveEventDisplaceFigure(
    figures: FiguresSlice,
    action: GameAction,
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const params = action.params as DisplaceFigureActionParams
    const subjectCtx = buildActionSubjectResolutionContext(ctx, figures.figuresByCoord)
    let instances = resolveActionSubjects(action, subjectCtx)

    if (instances.length === 0 && !action.subject?.entries?.length && ctx.ownerFigureId) {
        const target = resolveOwnerDisplaceTarget(figures, ctx, ctx.ownerFigureId)

        if (target) {
            instances = [{
                placement: target.placement,
                coord: target.fromCoord,
            }]
        }
    }

    if (instances.length === 0) {
        logFigureActionApply({
            context: 'applyMoveEventDisplaceFigure',
            gameAction: action,
            subject: ctx.ownerFigureId ?? ctx.actorPlacement.figureId,
            result: 'skipped',
            reason: 'no subject instances for displace',
        })
        return figures
    }

    return instances.reduce(
        (current, instance) => applyDisplaceFromCoord(
            current,
            params,
            instance.coord,
            instance.placement,
            ctx,
            queue,
        ),
        figures,
    )
}

export function steppedOnToMoveContext(ctx: SteppedOnActionContext): MoveEventContext {
    return {
        from: ctx.stepperCoord,
        to: ctx.targetCoord,
        actorPlacement: ctx.targetPlacement,
        targetAtTo: ctx.stepperPlacement,
        boardParameters: ctx.boardParameters,
        catalog: ctx.catalog,
        eventRules: ctx.eventRules,
        stepCause: ctx.stepCause,
        stepperPlacement: ctx.stepperPlacement,
        stepperCoord: ctx.targetCoord,
    }
}

function isSteppedOnTargetAlreadyReplaced(
    figures: FiguresSlice,
    ctx: SteppedOnActionContext,
): boolean {
    if (coordsEqual(ctx.stepperCoord, ctx.targetCoord)) {
        return false
    }

    return placementMatchesAt(figures, ctx.targetCoord, ctx.stepperPlacement)
        && !placementMatchesAt(figures, ctx.targetCoord, ctx.targetPlacement)
}

function addPlacementToTray(figures: FiguresSlice, placement: FigurePlacement): FiguresSlice {
    return {
        ...figures,
        tray: [cloneFigurePlacement(placement), ...figures.tray],
    }
}

function removeSteppedOnTargetFromBoard(
    figures: FiguresSlice,
    ctx: SteppedOnActionContext,
    placement: FigurePlacement,
): FiguresSlice {
    if (isSteppedOnTargetAlreadyReplaced(figures, ctx)) {
        return figures
    }

    return removePlacementFromBoard(figures, placement, ctx.targetCoord)
}

function findTrayIndex(figures: FiguresSlice, placement: FigurePlacement): number {
    return figures.tray.findIndex(item => placementsMatch(item, placement))
}

export function updatePlacementState(
    figures: FiguresSlice,
    placement: FigurePlacement,
    stateIndex: number,
): FiguresSlice {
    const located = findInstance(figures, placement.instanceId)

    if (!located) {
        return updateTrayPlacementState(figures, placement, stateIndex)
    }

    return replaceStackAtIndex(figures, located.coord, located.index, {
        ...figures.figuresByCoord[coordKey(located.coord)][located.index],
        stateIndex,
    })
}

export function updateTrayPlacementState(
    figures: FiguresSlice,
    placement: FigurePlacement,
    stateIndex: number,
): FiguresSlice {
    const trayIndex = findTrayIndex(figures, placement)

    if (trayIndex < 0) {
        return figures
    }

    const tray = [...figures.tray]
    tray[trayIndex] = {
        ...tray[trayIndex],
        stateIndex,
    }

    return {
        ...figures,
        tray,
    }
}

export function applyMoveToTrayFromCoord(
    figures: FiguresSlice,
    placement: FigurePlacement,
    fromCoord: CellCoord,
): FiguresSlice {
    const withoutBoard = removePlacementFromBoard(
        figures,
        placement,
        fromCoord,
    )

    return {
        ...withoutBoard,
        tray: [cloneFigurePlacement(placement), ...withoutBoard.tray],
    }
}

export function applyMoveToTray(
    figures: FiguresSlice,
    ctx: SteppedOnActionContext,
): FiguresSlice {
    if (!placementMatchesAt(figures, ctx.targetCoord, ctx.targetPlacement)) {
        return addPlacementToTray(figures, ctx.targetPlacement)
    }

    return applyMoveToTrayFromCoord(figures, ctx.targetPlacement, ctx.targetCoord)
}

export function applyDisplaceFigure(
    figures: FiguresSlice,
    action: GameAction,
    ctx: SteppedOnActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const params = action.params as DisplaceFigureActionParams
    const subjectCtx = buildSteppedOnActionSubjectContext(
        {
            stepperPlacement: ctx.stepperPlacement,
            stepperCoord: ctx.stepperCoord,
            targetPlacement: ctx.targetPlacement,
            targetCoord: ctx.targetCoord,
            cause: ctx.stepCause,
        },
        figures.figuresByCoord,
        ctx.targetPlacement.figureId,
    )
    let instances = resolveActionSubjects(action, subjectCtx)

    if (instances.length === 0) {
        instances = [{
            placement: ctx.targetPlacement,
            coord: ctx.targetCoord,
        }]
    }

    const moveCtx = steppedOnToMoveContext(ctx)

    return instances.reduce(
        (current, instance) => applyDisplaceFromCoord(
            current,
            params,
            instance.coord,
            instance.placement,
            moveCtx,
            queue,
        ),
        figures,
    )
}

export function applyLeaveBoardDisplace(
    figures: FiguresSlice,
    action: GameAction,
    ctx: LeaveBoardActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const params = action.params as DisplaceFigureActionParams
    const wrapParams = ctx.displaceParams ?? params
    const subjectCtx = buildLeaveBoardActionSubjectContext(ctx, figures.figuresByCoord)
    let instances = resolveActionSubjects(action, subjectCtx)

    if (instances.length === 0) {
        instances = [{
            placement: ctx.placement,
            coord: ctx.fromCoord,
        }]
    }

    return instances.reduce((current, instance) => {
        const placement = resolvePlacementSnapshot(current, instance.coord, instance.placement)
        const moveCtx = {
            catalog: ctx.catalog,
            boardParameters: ctx.boardParameters,
        } as MoveEventContext
        const { dx, dy } = resolveEffectiveDisplaceDeltas(wrapParams, placement.figureId, moveCtx)
        const landing = computeWrappedDisplaceLanding(
            instance.coord,
            dx,
            dy,
            ctx.boardParameters,
        )
        const topOccupant = getTopOfStack(current, landing)

        if (isStackOccupied(current, landing) && topOccupant && topOccupant.instanceId !== placement.instanceId) {
            return enqueueSteppedOnForOccupiedLanding(
                current,
                placement,
                instance.coord,
                landing,
                queue,
            )
        }

        return movePlacementToCoord(current, placement, instance.coord, landing)
    }, figures)
}