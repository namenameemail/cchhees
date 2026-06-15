import { CellCoord, coordKey, coordsEqual, isCoordInGrid } from '../types/coords'
import {
    DisplaceFigureActionParams,
    GameAction,
    GameActionType,
    SetOtherStateActionParams,
    SetSelfStateActionParams,
    SpawnFigureActionParams,
    FigureEventType,
} from '../types/events'
import { FiguresSlice } from '../state/slices'
import { cloneFiguresSlice } from '../state/reconcile'
import { cloneFigurePlacement, createFigurePlacement, placementsMatch } from '../figureView'
import { FigurePlacement } from '../types/figures'
import {
    computeDisplaceLanding,
    computeWrappedDisplaceLanding,
    isDisplaceLeavingBoard,
    LeaveBoardActionContext,
    SteppedOnActionContext,
    SteppedOnQueueItem,
} from './steppedOnQueue'
import { MoveEventContext } from './types'
import { gameMovesDebugLog } from '../gameMovesDebugLog'
import { logFigureActionApply, logFigureDisplaceDebug } from '../figureActionsDebugLog'

function resolveDisplaceTarget(
    figures: FiguresSlice,
    ctx: MoveEventContext,
): { fromCoord: CellCoord; placement: FigurePlacement } | null {
    if (ctx.eventType === FigureEventType.enterFigureArea && ctx.areaSubjectCoord && ctx.areaSubjectPlacement) {
        const key = coordKey(ctx.areaSubjectCoord)
        const placement = figures.figuresByCoord[key]

        if (placement && placement.instanceId === ctx.areaSubjectPlacement.instanceId) {
            return {
                fromCoord: ctx.areaSubjectCoord,
                placement,
            }
        }

        return {
            fromCoord: ctx.areaSubjectCoord,
            placement: ctx.areaSubjectPlacement,
        }
    }

    if (ctx.eventType === FigureEventType.areaEnteredBy && ctx.areaAnchor) {
        const key = coordKey(ctx.areaAnchor)
        const placement = figures.figuresByCoord[key]

        if (placement) {
            return {
                fromCoord: ctx.areaAnchor,
                placement,
            }
        }

        return null
    }

    const actorKey = coordKey(ctx.to)
    const actorAtTo = figures.figuresByCoord[actorKey]

    if (actorAtTo && actorAtTo.instanceId === ctx.actorPlacement.instanceId) {
        return {
            fromCoord: ctx.to,
            placement: actorAtTo,
        }
    }

    if (ctx.targetAtTo) {
        return {
            fromCoord: ctx.to,
            placement: ctx.targetAtTo,
        }
    }

    return {
        fromCoord: ctx.to,
        placement: ctx.actorPlacement,
    }
}

function applyMoveEventDisplaceFigure(
    figures: FiguresSlice,
    params: DisplaceFigureActionParams,
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const target = resolveDisplaceTarget(figures, ctx)

    if (!target) {
        logFigureActionApply({
            context: 'applyMoveEventDisplaceFigure',
            gameAction: { type: GameActionType.displaceFigure, params },
            subject: ctx.actorPlacement.figureId,
            result: 'skipped',
            reason: 'no figure to displace for event context',
            detail: {
                eventType: ctx.eventType,
                areaAnchor: ctx.areaAnchor,
                to: ctx.to,
                actor: ctx.actorPlacement.figureId,
            },
        })
        return figures
    }

    const { fromCoord, placement } = target
    const displaced = resolvePlacementSnapshot(figures, fromCoord, placement)

    if (isDisplaceLeavingBoard(fromCoord, params, ctx.boardParameters)) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: fromCoord,
            to: fromCoord,
            params,
            offBoard: true,
            blocked: true,
        })
        logFigureDisplaceDebug({
            context: 'applyMoveEventDisplaceFigure',
            subject: displaced.figureId,
            from: fromCoord,
            params,
            result: 'off-board',
            reason: 'landing leaves board; queued leaveBoard',
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
    const occupant = figures.figuresByCoord[landingKey]

    if (occupant && occupant.instanceId !== displaced.instanceId) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: fromCoord,
            to: landing,
            params,
            blocked: true,
        })
        logFigureDisplaceDebug({
            context: 'applyMoveEventDisplaceFigure',
            subject: displaced.figureId,
            from: fromCoord,
            to: landing,
            params,
            result: 'blocked',
            reason: 'landing occupied; queued displacement chain',
            detail: { occupant: occupant.figureId },
        })
        queue.unshift({
            kind: 'place',
            placement: displaced,
            coord: landing,
            fromCoord,
        })
        queue.unshift({
            stepperPlacement: displaced,
            stepperCoord: fromCoord,
            targetPlacement: cloneFigurePlacement(occupant),
            targetCoord: landing,
            cause: 'displacement',
        })
        return removePlacementFromBoard(figures, displaced, coordKey(fromCoord))
    }

    const withoutBoard = removePlacementFromBoard(figures, displaced, coordKey(fromCoord))

    gameMovesDebugLog.displace({
        placement: displaced,
        from: fromCoord,
        to: landing,
        params,
    })
    logFigureDisplaceDebug({
        context: 'applyMoveEventDisplaceFigure',
        subject: displaced.figureId,
        from: fromCoord,
        to: landing,
        params,
        result: 'moved',
    })
    logFigureActionApply({
        context: 'applyGameAction',
        gameAction: { type: GameActionType.displaceFigure, params },
        subject: displaced.figureId,
        result: 'applied',
        detail: { fromCoord, landing },
    })

    return {
        ...withoutBoard,
        figuresByCoord: {
            ...withoutBoard.figuresByCoord,
            [landingKey]: displaced,
        },
    }
}

function steppedOnToMoveContext(ctx: SteppedOnActionContext): MoveEventContext {
    return {
        from: ctx.stepperCoord,
        to: ctx.targetCoord,
        actorPlacement: ctx.targetPlacement,
        targetAtTo: ctx.stepperPlacement,
        boardParameters: ctx.boardParameters,
        catalog: ctx.catalog,
        stepCause: ctx.stepCause,
        stepperPlacement: ctx.stepperPlacement,
        stepperCoord: ctx.stepperCoord,
    }
}

function isSteppedOnTargetAlreadyReplaced(
    figures: FiguresSlice,
    ctx: SteppedOnActionContext,
): boolean {
    if (coordsEqual(ctx.stepperCoord, ctx.targetCoord)) {
        return false
    }

    const occupant = figures.figuresByCoord[coordKey(ctx.targetCoord)]

    return occupant != null
        && occupant.instanceId === ctx.stepperPlacement.instanceId
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

    return removePlacementFromBoard(figures, placement, coordKey(ctx.targetCoord))
}

function removePlacementFromBoard(
    figures: FiguresSlice,
    placement: FigurePlacement,
    preferredCoord?: string,
): FiguresSlice {
    const figuresByCoord = { ...figures.figuresByCoord }

    if (preferredCoord && figuresByCoord[preferredCoord]
        && placementsMatch(figuresByCoord[preferredCoord], placement)) {
        delete figuresByCoord[preferredCoord]
        return { ...figures, figuresByCoord }
    }

    for (const [key, value] of Object.entries(figuresByCoord)) {
        if (placementsMatch(value, placement)) {
            delete figuresByCoord[key]
            break
        }
    }

    return { ...figures, figuresByCoord }
}

function findTrayIndex(figures: FiguresSlice, placement: FigurePlacement): number {
    return figures.tray.findIndex(item => placementsMatch(item, placement))
}

function updatePlacementState(
    figures: FiguresSlice,
    coordKeyValue: string,
    stateIndex: number,
): FiguresSlice {
    const placement = figures.figuresByCoord[coordKeyValue]
    if (!placement) {
        return figures
    }

    return {
        ...figures,
        figuresByCoord: {
            ...figures.figuresByCoord,
            [coordKeyValue]: {
                ...placement,
                stateIndex,
            },
        },
    }
}

function updateTrayPlacementState(
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

function resolvePlacementSnapshot(
    figures: FiguresSlice,
    preferredCoord: CellCoord,
    snapshot: FigurePlacement,
): FigurePlacement {
    const atPreferred = figures.figuresByCoord[coordKey(preferredCoord)]

    if (atPreferred && placementsMatch(atPreferred, snapshot)) {
        return cloneFigurePlacement(atPreferred)
    }

    const boardKey = findBoardCoordForPlacement(figures, snapshot)

    if (boardKey) {
        return cloneFigurePlacement(figures.figuresByCoord[boardKey])
    }

    return cloneFigurePlacement(snapshot)
}

function findBoardCoordForPlacement(
    figures: FiguresSlice,
    placement: FigurePlacement,
): string | undefined {
    for (const [key, value] of Object.entries(figures.figuresByCoord)) {
        if (placementsMatch(value, placement)) {
            return key
        }
    }

    return undefined
}

function applyMoveToTrayFromCoord(
    figures: FiguresSlice,
    placement: FigurePlacement,
    fromCoord: CellCoord,
): FiguresSlice {
    const withoutBoard = removePlacementFromBoard(
        figures,
        placement,
        coordKey(fromCoord),
    )

    return {
        ...withoutBoard,
        tray: [cloneFigurePlacement(placement), ...withoutBoard.tray],
    }
}

function applyMoveToTray(
    figures: FiguresSlice,
    ctx: SteppedOnActionContext,
): FiguresSlice {
    if (isSteppedOnTargetAlreadyReplaced(figures, ctx)) {
        return addPlacementToTray(figures, ctx.targetPlacement)
    }

    return applyMoveToTrayFromCoord(figures, ctx.targetPlacement, ctx.targetCoord)
}

function applyDisplaceFigure(
    figures: FiguresSlice,
    params: DisplaceFigureActionParams,
    ctx: SteppedOnActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const displaced = resolvePlacementSnapshot(figures, ctx.targetCoord, ctx.targetPlacement)

    if (isDisplaceLeavingBoard(ctx.targetCoord, params, ctx.boardParameters)) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: ctx.targetCoord,
            to: ctx.targetCoord,
            params,
            offBoard: true,
            blocked: true,
        })
        logFigureDisplaceDebug({
            context: 'applyDisplaceFigure',
            subject: displaced.figureId,
            from: ctx.targetCoord,
            params,
            result: 'off-board',
            reason: 'landing leaves board; queued leaveBoard',
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

    const landingKey = coordKey(landing)
    const occupant = figures.figuresByCoord[landingKey]

    if (occupant && occupant.instanceId !== displaced.instanceId) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: ctx.targetCoord,
            to: landing,
            params,
            blocked: true,
        })
        logFigureDisplaceDebug({
            context: 'applyDisplaceFigure',
            subject: displaced.figureId,
            from: ctx.targetCoord,
            to: landing,
            params,
            result: 'blocked',
            reason: 'landing occupied; queued steppedOn displacement chain',
            detail: { occupant: occupant.figureId },
        })
        queue.unshift({
            kind: 'place',
            placement: displaced,
            coord: landing,
            fromCoord: ctx.targetCoord,
        })
        queue.unshift({
            stepperPlacement: displaced,
            stepperCoord: ctx.targetCoord,
            targetPlacement: cloneFigurePlacement(occupant),
            targetCoord: landing,
            cause: 'displacement',
        })
        return removeSteppedOnTargetFromBoard(figures, ctx, displaced)
    }

    const withoutBoard = removeSteppedOnTargetFromBoard(figures, ctx, displaced)

    gameMovesDebugLog.displace({
        placement: displaced,
        from: ctx.targetCoord,
        to: landing,
        params,
    })
    logFigureDisplaceDebug({
        context: 'applyDisplaceFigure',
        subject: displaced.figureId,
        from: ctx.targetCoord,
        to: landing,
        params,
        result: 'moved',
    })

    return {
        ...withoutBoard,
        figuresByCoord: {
            ...withoutBoard.figuresByCoord,
            [landingKey]: displaced,
        },
    }
}

function applyLeaveBoardDisplace(
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
    const landingKey = coordKey(landing)
    const occupant = figures.figuresByCoord[landingKey]

    if (occupant && occupant.instanceId !== placement.instanceId) {
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
            detail: { occupant: occupant.figureId, wrapped: true },
        })
        queue.unshift({
            kind: 'place',
            placement,
            coord: landing,
            fromCoord: ctx.fromCoord,
        })
        queue.unshift({
            stepperPlacement: placement,
            stepperCoord: ctx.fromCoord,
            targetPlacement: cloneFigurePlacement(occupant),
            targetCoord: landing,
            cause: 'displacement',
        })
        return removePlacementFromBoard(figures, placement, coordKey(ctx.fromCoord))
    }

    const withoutBoard = removePlacementFromBoard(figures, placement, coordKey(ctx.fromCoord))

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

    return {
        ...withoutBoard,
        figuresByCoord: {
            ...withoutBoard.figuresByCoord,
            [landingKey]: placement,
        },
    }
}

export function applyLeaveBoardAction(
    figures: FiguresSlice,
    action: GameAction,
    ctx: LeaveBoardActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    gameMovesDebugLog.actionApplied({
        action,
        subject: ctx.placement.figureId,
    })
    logFigureActionApply({
        context: 'applyLeaveBoardAction',
        gameAction: action,
        subject: ctx.placement.figureId,
        result: 'applied',
    })

    switch (action.type) {
        case GameActionType.moveToTray:
            return applyMoveToTrayFromCoord(figures, ctx.placement, ctx.fromCoord)
        case GameActionType.displaceFigure:
            return applyLeaveBoardDisplace(
                figures,
                action.params as DisplaceFigureActionParams,
                ctx,
                queue,
            )
        default:
            return figures
    }
}

export function applySteppedOnAction(
    figures: FiguresSlice,
    action: GameAction,
    ctx: SteppedOnActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    gameMovesDebugLog.actionApplied({
        action,
        subject: ctx.targetPlacement.figureId,
    })
    logFigureActionApply({
        context: 'applySteppedOnAction',
        gameAction: action,
        subject: ctx.targetPlacement.figureId,
        result: 'applied',
    })

    switch (action.type) {
        case GameActionType.moveToTray:
            return applyMoveToTray(figures, ctx)
        case GameActionType.displaceFigure:
            return applyDisplaceFigure(
                figures,
                action.params as DisplaceFigureActionParams,
                ctx,
                queue,
            )
        case GameActionType.spawnFigure:
        case GameActionType.setSelfState:
        case GameActionType.setOtherState:
            return applyGameAction(figures, action, steppedOnToMoveContext(ctx))
        default:
            return figures
    }
}

function applySpawnFigure(
    figures: FiguresSlice,
    params: SpawnFigureActionParams,
    boardN: number,
    boardM: number,
): FiguresSlice {
    const coord = { i: params.x - 1, j: params.y - 1 }

    if (!isCoordInGrid(coord, boardN, boardM)) {
        return figures
    }

    const key = coordKey(coord)

    return {
        ...figures,
        figuresByCoord: {
            ...figures.figuresByCoord,
            [key]: createFigurePlacement(params.figureId, params.stateIndex),
        },
    }
}

function applySetOtherState(
    figures: FiguresSlice,
    params: SetOtherStateActionParams,
    ctx: MoveEventContext,
): FiguresSlice {
    const stateIndex = Math.max(0, Math.trunc(params.stateIndex))

    switch (params.target) {
        case 'steppedOn': {
            if (ctx.swappedTargetCoord && ctx.targetAtTo) {
                return updatePlacementState(figures, coordKey(ctx.swappedTargetCoord), stateIndex)
            }

            if (ctx.targetAtTo) {
                const boardKey = findBoardCoordForPlacement(figures, ctx.targetAtTo)
                if (boardKey) {
                    return updatePlacementState(figures, boardKey, stateIndex)
                }

                return updateTrayPlacementState(figures, ctx.targetAtTo, stateIndex)
            }

            if (ctx.capturedPlacement) {
                return updateTrayPlacementState(figures, ctx.capturedPlacement, stateIndex)
            }

            return figures
        }
        case 'steppedBy':
            return updatePlacementState(figures, coordKey(ctx.to), stateIndex)
        case 'areaAnchor':
            if (!ctx.areaAnchor) {
                return figures
            }
            return updatePlacementState(figures, coordKey(ctx.areaAnchor), stateIndex)
        default:
            return figures
    }
}

export function applyGameAction(
    figures: FiguresSlice,
    action: GameAction,
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[] = [],
): FiguresSlice {
    gameMovesDebugLog.actionApplied({
        action,
        subject: ctx.actorPlacement.figureId,
    })

    switch (action.type) {
        case GameActionType.spawnFigure:
            logFigureActionApply({
                context: 'applyGameAction',
                gameAction: action,
                subject: ctx.actorPlacement.figureId,
                result: 'applied',
            })
            return applySpawnFigure(
                figures,
                action.params as SpawnFigureActionParams,
                ctx.boardParameters.n,
                ctx.boardParameters.m,
            )
        case GameActionType.setSelfState: {
            logFigureActionApply({
                context: 'applyGameAction',
                gameAction: action,
                subject: ctx.actorPlacement.figureId,
                result: 'applied',
            })
            const stateIndex = Math.max(0, Math.trunc((action.params as SetSelfStateActionParams).stateIndex))
            const boardKey = findBoardCoordForPlacement(figures, ctx.actorPlacement)

            if (boardKey) {
                return updatePlacementState(figures, boardKey, stateIndex)
            }

            return updateTrayPlacementState(figures, ctx.actorPlacement, stateIndex)
        }
        case GameActionType.setOtherState:
            logFigureActionApply({
                context: 'applyGameAction',
                gameAction: action,
                subject: ctx.actorPlacement.figureId,
                result: 'applied',
                detail: {
                    target: (action.params as SetOtherStateActionParams).target,
                    areaAnchor: ctx.areaAnchor,
                },
            })
            return applySetOtherState(figures, action.params as SetOtherStateActionParams, ctx)
        case GameActionType.moveToTray:
            logFigureActionApply({
                context: 'applyGameAction',
                gameAction: action,
                subject: ctx.actorPlacement.figureId,
                result: 'no-op',
                reason: 'moveToTray only works in steppedOn/leaveBoard queue',
            })
            return figures
        case GameActionType.displaceFigure:
            return applyMoveEventDisplaceFigure(
                figures,
                action.params as DisplaceFigureActionParams,
                ctx,
                queue,
            )
        default:
            logFigureActionApply({
                context: 'applyGameAction',
                gameAction: action,
                subject: ctx.actorPlacement.figureId,
                result: 'skipped',
                reason: 'unknown action type',
            })
            return figures
    }
}

export function applyGameActions(
    figures: FiguresSlice,
    actions: GameAction[],
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[] = [],
): FiguresSlice {
    return actions.reduce(
        (current, action) => applyGameAction(current, action, ctx, queue),
        cloneFiguresSlice(figures),
    )
}
