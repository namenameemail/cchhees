import { coordKey, isCoordInGrid } from '../types/coords'
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
import { createFigurePlacement } from '../figureView'
import { pushToStack } from '../figureStack'
import {
    LeaveBoardActionContext,
    SteppedOnActionContext,
    SteppedOnQueueItem,
} from './steppedOnQueue'
import { MoveEventContext } from './types'
import { gameMovesDebugLog } from '../gameMovesDebugLog'
import { logFigureActionApply } from '../figureActionsDebugLog'
import {
    applyMoveEventDisplaceFigure,
    applyDisplaceFigure,
    applyLeaveBoardDisplace,
    steppedOnToMoveContext,
    applyMoveToTrayFromCoord,
    applyMoveToTray,
    updatePlacementState,
} from './actions/displaceFigure'

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

    return pushToStack(
        figures,
        coord,
        createFigurePlacement(params.figureId, params.stateIndex),
    )
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
                return updatePlacementState(figures, ctx.targetAtTo, stateIndex)
            }

            if (ctx.targetAtTo) {
                return updatePlacementState(figures, ctx.targetAtTo, stateIndex)
            }

            return figures
        }
        case 'steppedBy':
            if (ctx.stepperPlacement) {
                return updatePlacementState(figures, ctx.stepperPlacement, stateIndex)
            }
            return figures
        case 'areaAnchor':
            if (!ctx.areaAnchor) {
                return figures
            }

            {
                const stack = figures.figuresByCoord[coordKey(ctx.areaAnchor)] ?? []
                const anchorPlacement = stack.find(item => item.figureId === ctx.ownerFigureId)

                if (anchorPlacement) {
                    return updatePlacementState(figures, anchorPlacement, stateIndex)
                }
            }

            return figures
        default:
            return figures
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
            return updatePlacementState(figures, ctx.actorPlacement, stateIndex)
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
