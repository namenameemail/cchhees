import { CellCoord, coordKey, coordsEqual, isCoordInGrid } from '../types/coords'
import {
    DisplaceFigureActionParams,
    GameAction,
    GameActionType,
    SetOtherStateActionParams,
    SetSelfStateActionParams,
    SpawnFigureActionParams,
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
): FiguresSlice {
    gameMovesDebugLog.actionApplied({
        action,
        subject: ctx.actorPlacement.figureId,
    })

    switch (action.type) {
        case GameActionType.spawnFigure:
            return applySpawnFigure(
                figures,
                action.params as SpawnFigureActionParams,
                ctx.boardParameters.n,
                ctx.boardParameters.m,
            )
        case GameActionType.setSelfState: {
            const stateIndex = Math.max(0, Math.trunc((action.params as SetSelfStateActionParams).stateIndex))
            const boardKey = findBoardCoordForPlacement(figures, ctx.actorPlacement)

            if (boardKey) {
                return updatePlacementState(figures, boardKey, stateIndex)
            }

            return updateTrayPlacementState(figures, ctx.actorPlacement, stateIndex)
        }
        case GameActionType.setOtherState:
            return applySetOtherState(figures, action.params as SetOtherStateActionParams, ctx)
        case GameActionType.moveToTray:
        case GameActionType.displaceFigure:
            return figures
        default:
            return figures
    }
}

export function applyGameActions(
    figures: FiguresSlice,
    actions: GameAction[],
    ctx: MoveEventContext,
): FiguresSlice {
    return actions.reduce(
        (current, action) => applyGameAction(current, action, ctx),
        cloneFiguresSlice(figures),
    )
}
