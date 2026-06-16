import { CellCoord, coordKey, coordsEqual } from '../../types/coords'
import {
    DisplaceFigureActionParams,
    GameAction,
    GameActionType,
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
import { gameMovesDebugLog } from '../../gameMovesDebugLog'
import { logFigureActionApply, logFigureDisplaceDebug } from '../../figureActionsDebugLog'

function placementMatchesOwner(placement: FigurePlacement, ownerFigureId: FigureId): boolean {
    return placement.figureId === ownerFigureId
}

function resolveOwnerDisplaceTarget(
    figures: FiguresSlice,
    ctx: MoveEventContext,
    ownerFigureId: FigureId,
): { fromCoord: CellCoord; placement: FigurePlacement } | null {
    switch (ctx.eventType) {
        case FigureEventType.steppedOnBy: {
            if (!ctx.targetAtTo || !placementMatchesOwner(ctx.targetAtTo, ownerFigureId)) {
                return null
            }

            return {
                fromCoord: ctx.to,
                placement: resolvePlacementSnapshot(figures, ctx.to, ctx.targetAtTo),
            }
        }
        case FigureEventType.stepOnFigure: {
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
        case FigureEventType.enterFigureArea: {
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
        case FigureEventType.areaEnteredBy: {
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

function movePlacementToCoord(
    figures: FiguresSlice,
    placement: FigurePlacement,
    fromCoord: CellCoord,
    toCoord: CellCoord,
): FiguresSlice {
    const withoutBoard = removePlacementFromBoard(figures, placement, fromCoord)
    return pushToStack(withoutBoard, toCoord, placement)
}

export function applyMoveEventDisplaceFigure(
    figures: FiguresSlice,
    params: DisplaceFigureActionParams,
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const ownerFigureId = ctx.ownerFigureId

    if (!ownerFigureId) {
        logFigureActionApply({
            context: 'applyMoveEventDisplaceFigure',
            gameAction: { type: GameActionType.displaceFigure, params },
            subject: ctx.actorPlacement.figureId,
            result: 'skipped',
            reason: 'missing ownerFigureId in event context',
            detail: {
                eventType: ctx.eventType,
                actor: ctx.actorPlacement.figureId,
            },
        })
        return figures
    }

    const target = resolveOwnerDisplaceTarget(figures, ctx, ownerFigureId)

    if (!target) {
        logFigureActionApply({
            context: 'applyMoveEventDisplaceFigure',
            gameAction: { type: GameActionType.displaceFigure, params },
            subject: ownerFigureId,
            result: 'skipped',
            reason: 'owner figure not found for displace',
            detail: {
                eventType: ctx.eventType,
                ownerFigureId,
                areaAnchor: ctx.areaAnchor,
                to: ctx.to,
                from: ctx.from,
            },
        })
        return figures
    }

    const { fromCoord, placement } = target
    const displaced = resolvePlacementSnapshot(figures, fromCoord, placement)
    const displaceLogDetail = {
        ownerFigureId,
        eventType: ctx.eventType,
    }

    if (isDisplaceLeavingBoard(fromCoord, params, ctx.boardParameters)) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: fromCoord,
            to: fromCoord,
            params,
            offBoard: true,
            blocked: true,
            ownerFigureId,
            eventType: ctx.eventType,
        })
        logFigureDisplaceDebug({
            context: 'applyMoveEventDisplaceFigure',
            subject: displaced.figureId,
            from: fromCoord,
            params,
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
        params.dx,
        params.dy,
        ctx.boardParameters,
    )
    const landingKey = coordKey(landing)
    const landingOccupied = isStackOccupied(figures, landing)
    const topOccupant = getTopOfStack(figures, landing)

    if (landingOccupied && topOccupant && topOccupant.instanceId !== displaced.instanceId) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: fromCoord,
            to: landing,
            params,
            blocked: true,
            ownerFigureId,
            eventType: ctx.eventType,
        })
        logFigureDisplaceDebug({
            context: 'applyMoveEventDisplaceFigure',
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
        ownerFigureId,
        eventType: ctx.eventType,
    })
    logFigureDisplaceDebug({
        context: 'applyMoveEventDisplaceFigure',
        subject: displaced.figureId,
        from: fromCoord,
        to: landing,
        params,
        result: 'moved',
        detail: displaceLogDetail,
    })
    logFigureActionApply({
        context: 'applyGameAction',
        gameAction: { type: GameActionType.displaceFigure, params },
        subject: displaced.figureId,
        result: 'applied',
        detail: { fromCoord, landing },
    })

    return movePlacementToCoord(figures, displaced, fromCoord, landing)
}

export function steppedOnToMoveContext(ctx: SteppedOnActionContext): MoveEventContext {
    return {
        from: ctx.stepperCoord,
        to: ctx.targetCoord,
        actorPlacement: ctx.targetPlacement,
        targetAtTo: ctx.stepperPlacement,
        boardParameters: ctx.boardParameters,
        catalog: ctx.catalog,
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
    params: DisplaceFigureActionParams,
    ctx: SteppedOnActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const displaced = resolvePlacementSnapshot(figures, ctx.targetCoord, ctx.targetPlacement)
    const displaceLogDetail = {
        ownerFigureId: ctx.targetPlacement.figureId,
        eventType: FigureEventType.steppedOnBy,
    }

    if (isDisplaceLeavingBoard(ctx.targetCoord, params, ctx.boardParameters)) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: ctx.targetCoord,
            to: ctx.targetCoord,
            params,
            offBoard: true,
            blocked: true,
            ownerFigureId: ctx.targetPlacement.figureId,
            eventType: FigureEventType.steppedOnBy,
        })
        logFigureDisplaceDebug({
            context: 'applyDisplaceFigure',
            subject: displaced.figureId,
            from: ctx.targetCoord,
            params,
            result: 'off-board',
            reason: 'landing leaves board; queued leaveBoard',
            detail: displaceLogDetail,
        })
        queue.unshift({
            kind: 'leaveBoard',
            placement: displaced,
            fromCoord: ctx.targetCoord,
            displaceParams: params,
        })
        return figures
    }

    const landing = computeDisplaceLanding(
        ctx.targetCoord,
        params.dx,
        params.dy,
        ctx.boardParameters,
    )

    const topOccupant = getTopOfStack(figures, landing)

    if (isStackOccupied(figures, landing) && topOccupant && topOccupant.instanceId !== displaced.instanceId) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: ctx.targetCoord,
            to: landing,
            params,
            blocked: true,
            ownerFigureId: ctx.targetPlacement.figureId,
            eventType: FigureEventType.steppedOnBy,
        })
        logFigureDisplaceDebug({
            context: 'applyDisplaceFigure',
            subject: displaced.figureId,
            from: ctx.targetCoord,
            to: landing,
            params,
            result: 'blocked',
            reason: 'landing occupied; queued steppedOn displacement chain',
            detail: { occupant: topOccupant.figureId, ...displaceLogDetail },
        })
        return enqueueSteppedOnForOccupiedLanding(
            figures,
            displaced,
            ctx.targetCoord,
            landing,
            queue,
        )
    }

    gameMovesDebugLog.displace({
        placement: displaced,
        from: ctx.targetCoord,
        to: landing,
        params,
        ownerFigureId: ctx.targetPlacement.figureId,
        eventType: FigureEventType.steppedOnBy,
    })
    logFigureDisplaceDebug({
        context: 'applyDisplaceFigure',
        subject: displaced.figureId,
        from: ctx.targetCoord,
        to: landing,
        params,
        result: 'moved',
        detail: displaceLogDetail,
    })

    return movePlacementToCoord(figures, displaced, ctx.targetCoord, landing)
}

export function applyLeaveBoardDisplace(
    figures: FiguresSlice,
    params: DisplaceFigureActionParams,
    ctx: LeaveBoardActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const placement = resolvePlacementSnapshot(figures, ctx.fromCoord, ctx.placement)
    const wrapParams = ctx.displaceParams ?? params
    const landing = computeWrappedDisplaceLanding(
        ctx.fromCoord,
        wrapParams.dx,
        wrapParams.dy,
        ctx.boardParameters,
    )
    const topOccupant = getTopOfStack(figures, landing)

    if (isStackOccupied(figures, landing) && topOccupant && topOccupant.instanceId !== placement.instanceId) {
        gameMovesDebugLog.displace({
            placement,
            from: ctx.fromCoord,
            to: landing,
            params: wrapParams,
            wrapped: true,
            blocked: true,
        })
        logFigureDisplaceDebug({
            context: 'applyLeaveBoardDisplace',
            subject: placement.figureId,
            from: ctx.fromCoord,
            to: landing,
            params: wrapParams,
            result: 'blocked',
            reason: 'wrapped landing occupied; queued displacement chain',
            detail: { occupant: topOccupant.figureId, wrapped: true },
        })
        return enqueueSteppedOnForOccupiedLanding(
            figures,
            placement,
            ctx.fromCoord,
            landing,
            queue,
        )
    }

    gameMovesDebugLog.displace({
        placement,
        from: ctx.fromCoord,
        to: landing,
        params: wrapParams,
        wrapped: true,
    })
    logFigureDisplaceDebug({
        context: 'applyLeaveBoardDisplace',
        subject: placement.figureId,
        from: ctx.fromCoord,
        to: landing,
        params: wrapParams,
        result: 'wrapped',
    })

    return movePlacementToCoord(figures, placement, ctx.fromCoord, landing)
}