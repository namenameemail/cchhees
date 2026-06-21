import { isCoordInGrid } from '../types/coords'
import {
    GameAction,
    GameActionType,
    MoveToCellActionParams,
    SetSelfStateActionParams,
    SpawnFigureActionParams,
} from '../types/events'
import { FiguresSlice } from '../state/slices'
import { cloneFiguresSlice } from '../state/reconcile'
import { createFigurePlacement } from '../figureView'
import { pushToStack, resolvePlacementSnapshot } from '../figureStack'
import {
    ActionQueueResolveDeps,
    drainActionQueue,
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
import { applyMoveToCellFromCoord } from './actions/moveToCell'
import {
    buildActionSubjectResolutionContext,
    buildLeaveBoardActionSubjectContext,
    buildSteppedOnActionSubjectContext,
    resolveActionSubjects,
} from './actions/resolveActionSubjects'

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

function applyStateToInstances(
    figures: FiguresSlice,
    stateIndex: number,
    instances: ReturnType<typeof resolveActionSubjects>,
): FiguresSlice {
    return instances.reduce(
        (current, instance) => {
            const placement = resolvePlacementSnapshot(current, instance.coord, instance.placement)
            return updatePlacementState(current, placement, stateIndex)
        },
        figures,
    )
}

function applyMoveToTrayForInstances(
    figures: FiguresSlice,
    instances: ReturnType<typeof resolveActionSubjects>,
): FiguresSlice {
    return instances.reduce((current, instance) => {
        const placement = resolvePlacementSnapshot(current, instance.coord, instance.placement)
        return applyMoveToTrayFromCoord(current, placement, instance.coord)
    }, figures)
}

export function applyLeaveBoardAction(
    figures: FiguresSlice,
    action: GameAction,
    ctx: LeaveBoardActionContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const subjectCtx = buildLeaveBoardActionSubjectContext(ctx, figures.figuresByCoord)
    const instances = resolveActionSubjects(action, subjectCtx)

    gameMovesDebugLog.actionApplied({
        action,
        subject: ctx.placement.figureId,
    })

    switch (action.type) {
        case GameActionType.moveToTray: {
            logFigureActionApply({
                context: 'applyLeaveBoardAction',
                gameAction: action,
                subject: ctx.placement.figureId,
                result: 'applied',
            })

            if (instances.length > 0) {
                return applyMoveToTrayForInstances(figures, instances)
            }

            return applyMoveToTrayFromCoord(figures, ctx.placement, ctx.fromCoord)
        }
        case GameActionType.displaceFigure:
            return applyLeaveBoardDisplace(figures, action, ctx, queue)
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
    const instances = resolveActionSubjects(action, subjectCtx)

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
            if (instances.length > 0) {
                return applyMoveToTrayForInstances(figures, instances)
            }

            return applyMoveToTray(figures, ctx)
        case GameActionType.displaceFigure:
            return applyDisplaceFigure(figures, action, ctx, queue)
        case GameActionType.spawnFigure:
        case GameActionType.setSelfState:
        case GameActionType.setOtherState:
        case GameActionType.moveToCell:
            return applyGameAction(figures, action, steppedOnToMoveContext(ctx), queue)
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
    const subjectCtx = buildActionSubjectResolutionContext(ctx, figures.figuresByCoord)
    const instances = resolveActionSubjects(action, subjectCtx)

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
        case GameActionType.setSelfState:
        case GameActionType.setOtherState: {
            const stateIndex = Math.max(0, Math.trunc((action.params as SetSelfStateActionParams).stateIndex))

            if (instances.length === 0) {
                logFigureActionApply({
                    context: 'applyGameAction',
                    gameAction: action,
                    subject: ctx.actorPlacement.figureId,
                    result: 'skipped',
                    reason: 'no subject instances for setState',
                })
                return figures
            }

            logFigureActionApply({
                context: 'applyGameAction',
                gameAction: action,
                subject: ctx.actorPlacement.figureId,
                result: 'applied',
            })

            return applyStateToInstances(figures, stateIndex, instances)
        }
        case GameActionType.moveToTray: {
            if (instances.length === 0) {
                logFigureActionApply({
                    context: 'applyGameAction',
                    gameAction: action,
                    subject: ctx.actorPlacement.figureId,
                    result: 'no-op',
                    reason: 'moveToTray only works in steppedOn/leaveBoard queue',
                })
                return figures
            }

            logFigureActionApply({
                context: 'applyGameAction',
                gameAction: action,
                subject: ctx.actorPlacement.figureId,
                result: 'applied',
            })

            return applyMoveToTrayForInstances(figures, instances)
        }
        case GameActionType.moveToCell: {
            const params = action.params as MoveToCellActionParams

            if (instances.length === 0) {
                logFigureActionApply({
                    context: 'applyGameAction',
                    gameAction: action,
                    subject: ctx.actorPlacement.figureId,
                    result: 'skipped',
                    reason: 'no subject instances for moveToCell',
                })
                return figures
            }

            return instances.reduce(
                (current, instance) => applyMoveToCellFromCoord(
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
        case GameActionType.displaceFigure:
            return applyMoveEventDisplaceFigure(figures, action, ctx, queue)
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

export function applyActionsWithSpawnedEventDrain<Ctx>(
    figures: FiguresSlice,
    actions: GameAction[],
    ctx: Ctx,
    queue: SteppedOnQueueItem[],
    applyOne: (
        figures: FiguresSlice,
        action: GameAction,
        ctx: Ctx,
        queue: SteppedOnQueueItem[],
    ) => FiguresSlice,
    deps: ActionQueueResolveDeps,
): FiguresSlice {
    let current = cloneFiguresSlice(figures)

    for (const action of actions) {
        const queueSizeBefore = queue.length
        current = applyOne(current, action, ctx, queue)

        if (queue.length > queueSizeBefore) {
            current = drainActionQueue(current, queue, deps)
        }
    }

    return current
}

export function applyGameActions(
    figures: FiguresSlice,
    actions: GameAction[],
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[] = [],
): FiguresSlice {
    return applyActionsWithSpawnedEventDrain(
        figures,
        actions,
        ctx,
        queue,
        applyGameAction,
        {
            catalog: ctx.catalog,
            eventRules: ctx.eventRules,
            boardParameters: ctx.boardParameters,
            onStep: ctx.onStep,
        },
    )
}
