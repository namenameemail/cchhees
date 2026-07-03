import { BoardParameters } from '../types/boardParameters'
import { CellCoord, coordKey, isCoordInGrid } from '../types/coords'
import {
    DisplaceFigureActionParams,
    FigureEventRule,
    GameAction,
    GameActionType,
    FigureEventType,
    StepCause,
} from '../types/events'
import { evaluateSteppedOnRule, evaluateLeaveBoardRule } from './conditions/evaluate'
import { resolveEventRule } from './migrateEventRules'
import { FigureCatalog, FigurePlacement } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import { cloneFigurePlacement } from '../figureView'
import {
    cloneFiguresByCoord,
    findInstance,
    getTopOfStack,
    placementMatchesAt,
    pushToStack,
    removePlacementFromBoard,
} from '../figureStack'
import { applyActionsWithSpawnedEventDrain, applyLeaveBoardAction, applySteppedOnAction } from './execute'
import { gameMovesDebugLog } from '../gameMovesDebugLog'
import { runFigureEvents } from './runFigureEvents'
import { FigureStepRecorder, recordFigureStep } from '../figureAnimation/figureStepRecorder'

export interface SteppedOnEvent {
    stepperPlacement: FigurePlacement
    stepperCoord: CellCoord
    /** реальная клетка, откуда пришёл степпер (до перестановки на targetCoord) — нужна для movedBy/geometry-before у $moved при cause:'displacement' */
    stepperOrigin?: CellCoord
    targetPlacement: FigurePlacement
    targetCoord: CellCoord
    cause: Exclude<StepCause, 'any'>
}

export interface LeaveBoardActionContext {
    placement: FigurePlacement
    fromCoord: CellCoord
    boardParameters: BoardParameters
    catalog: FigureCatalog
    displaceParams?: DisplaceFigureActionParams
}

export interface SteppedOnActionContext {
    stepperPlacement: FigurePlacement
    stepperCoord: CellCoord
    targetPlacement: FigurePlacement
    targetCoord: CellCoord
    stepCause: Exclude<StepCause, 'any'>
    boardParameters: BoardParameters
    catalog: FigureCatalog
    eventRules: FigureEventRule[]
}

export type PlaceQueueItem = {
    kind: 'place'
    placement: FigurePlacement
    coord: CellCoord
    fromCoord?: CellCoord
}

export interface DisplacedQueueEvent {
    kind: 'displaced'
    placement: FigurePlacement
    fromCoord: CellCoord
    toCoord: CellCoord
    cause: Exclude<StepCause, 'any'>
}

export type SteppedOnQueueItem = SteppedOnEvent | LeaveBoardQueueEvent | PlaceQueueItem | DisplacedQueueEvent

export interface LeaveBoardQueueEvent {
    kind: 'leaveBoard'
    placement: FigurePlacement
    fromCoord: CellCoord
    displaceParams?: DisplaceFigureActionParams
}

type QueueItem = SteppedOnQueueItem

export type ActionQueueResolveDeps = {
    catalog: FigureCatalog
    eventRules: FigureEventRule[]
    boardParameters: BoardParameters
    onStep?: FigureStepRecorder
    /** instanceId -> направление ухода с доски; подхватывается новой точкой записи шага в applyActionsWithSpawnedEventDrain */
    exitHints?: Record<string, { dx: number; dy: number }>
}

export function computeDisplaceLanding(
    from: CellCoord,
    dx: number,
    dy: number,
    board: BoardParameters,
): CellCoord {
    const next = {
        i: from.i + Math.trunc(dx),
        j: from.j + Math.trunc(dy),
    }

    if (!isCoordInGrid(next, board.n, board.m)) {
        return from
    }

    return next
}

export function computeIntendedDisplaceLanding(
    from: CellCoord,
    dx: number,
    dy: number,
): CellCoord {
    return {
        i: from.i + Math.trunc(dx),
        j: from.j + Math.trunc(dy),
    }
}

export function isDisplaceLeavingBoard(
    from: CellCoord,
    params: DisplaceFigureActionParams,
    board: BoardParameters,
): boolean {
    const intended = computeIntendedDisplaceLanding(from, params.dx, params.dy)

    return !isCoordInGrid(intended, board.n, board.m)
}

/** Toroidal wrap: intended off-board landing appears on the opposite side */
export function computeWrappedDisplaceLanding(
    from: CellCoord,
    dx: number,
    dy: number,
    board: BoardParameters,
): CellCoord {
    const intended = computeIntendedDisplaceLanding(from, dx, dy)
    const n = board.n
    const m = board.m

    return {
        i: ((intended.i % n) + n) % n,
        j: ((intended.j % m) + m) % m,
    }
}

export function matchesSteppedOnBy(
    rule: FigureEventRule,
    event: SteppedOnEvent,
    figures?: FiguresSlice,
): boolean {
    if (!figures) {
        return evaluateSteppedOnRule(rule, event, {})
    }

    return evaluateSteppedOnRule(rule, event, figures.figuresByCoord)
}

function findMatchingSteppedOnRules(
    event: SteppedOnEvent,
    eventRules: FigureEventRule[],
    figures: FiguresSlice,
): FigureEventRule[] {
    const matched: FigureEventRule[] = []

    for (const rawRule of eventRules) {
        const rule = resolveEventRule(rawRule)
        if (evaluateSteppedOnRule(rule, event, figures.figuresByCoord)) {
            matched.push(rule)
        }
    }

    return matched
}

function getFallbackMoveToTrayAction(): GameAction {
    return {
        type: GameActionType.moveToTray,
        params: {},
    }
}

function applySteppedOnActions(
    figures: FiguresSlice,
    actions: GameAction[],
    ctx: SteppedOnActionContext,
    queue: QueueItem[],
    onStep?: FigureStepRecorder,
): FiguresSlice {
    return applyActionsWithSpawnedEventDrain(
        figures,
        actions,
        ctx,
        queue,
        applySteppedOnAction,
        {
            catalog: ctx.catalog,
            eventRules: ctx.eventRules,
            boardParameters: ctx.boardParameters,
            onStep,
        },
    )
}

function cloneFiguresBeforeMove(figures: FiguresSlice): Record<string, FigurePlacement[]> {
    return cloneFiguresByCoord(figures.figuresByCoord)
}

function applyStepOnFigureEventsForStepper(
    figures: FiguresSlice,
    event: SteppedOnEvent,
    catalog: FigureCatalog,
    eventRules: FigureEventRule[],
    boardParameters: BoardParameters,
    onStep?: FigureStepRecorder,
): FiguresSlice {
    if (event.cause !== 'manual' && event.cause !== 'displacement') {
        return figures
    }

    return runFigureEvents(figures, {
        from: event.stepperOrigin ?? event.stepperCoord,
        to: event.targetCoord,
        actorPlacement: event.stepperPlacement,
        targetAtTo: event.targetPlacement,
        boardParameters,
        catalog,
        eventRules,
        stepCause: event.cause,
        stepperPlacement: event.stepperPlacement,
        stepperCoord: event.targetCoord,
        figuresBeforeMove: cloneFiguresBeforeMove(figures),
        onStep,
    })
}

function processDisplacedEvent(
    figures: FiguresSlice,
    event: DisplacedQueueEvent,
    catalog: FigureCatalog,
    eventRules: FigureEventRule[],
    boardParameters: BoardParameters,
    onStep?: FigureStepRecorder,
): FiguresSlice {
    return runFigureEvents(figures, {
        from: event.fromCoord,
        to: event.toCoord,
        actorPlacement: event.placement,
        boardParameters,
        catalog,
        eventRules,
        stepCause: event.cause,
        figuresBeforeMove: cloneFiguresBeforeMove(figures),
        onStep,
    })
}

function ensureStepperOnTarget(figures: FiguresSlice, event: SteppedOnEvent): FiguresSlice {
    if (placementMatchesAt(figures, event.targetCoord, event.stepperPlacement)) {
        return figures
    }

    const located = findInstance(figures, event.stepperPlacement.instanceId)

    if (!located) {
        return pushToStack(figures, event.targetCoord, event.stepperPlacement)
    }

    return figures
}

function processSteppedOnEvent(
    figures: FiguresSlice,
    event: SteppedOnEvent,
    catalog: FigureCatalog,
    eventRules: FigureEventRule[],
    boardParameters: BoardParameters,
    queue: QueueItem[],
    onStep?: FigureStepRecorder,
): FiguresSlice {
    let nextFigures = ensureStepperOnTarget(figures, event)

    const matched = findMatchingSteppedOnRules(event, eventRules, nextFigures)
    const ctx: SteppedOnActionContext = {
        stepperPlacement: event.stepperPlacement,
        stepperCoord: event.targetCoord,
        targetPlacement: event.targetPlacement,
        targetCoord: event.targetCoord,
        stepCause: event.cause,
        boardParameters,
        catalog,
        eventRules,
    }

    if (matched.length > 0) {
        gameMovesDebugLog.eventMatched({
            eventType: matched[0].type,
            ownerFigureId: event.targetPlacement.figureId,
            ruleId: matched[0].id,
            actions: matched[0].actions,
            context: `stepper=${event.stepperPlacement.figureId} cause=${event.cause}`,
        })

        nextFigures = applySteppedOnActions(nextFigures, matched[0].actions, ctx, queue, onStep)
    }

    return applyStepOnFigureEventsForStepper(nextFigures, {
        ...event,
        stepperCoord: event.targetCoord,
    }, catalog, eventRules, boardParameters, onStep)
}

function processLeaveBoardEvent(
    figures: FiguresSlice,
    event: LeaveBoardQueueEvent,
    catalog: FigureCatalog,
    eventRules: FigureEventRule[],
    boardParameters: BoardParameters,
    queue: QueueItem[],
    onStep?: FigureStepRecorder,
): FiguresSlice {
    const matched: FigureEventRule[] = []

    for (const rawRule of eventRules) {
        const rule = resolveEventRule(rawRule)
        if (evaluateLeaveBoardRule(rule, event.placement)) {
            matched.push(rule)
        }
    }

    const ctx = {
        placement: event.placement,
        fromCoord: event.fromCoord,
        boardParameters,
        catalog,
        displaceParams: event.displaceParams,
    }

    const exitHints = event.displaceParams
        ? { [event.placement.instanceId]: { dx: event.displaceParams.dx, dy: event.displaceParams.dy } }
        : undefined

    if (matched.length === 0) {
        const actions = [getFallbackMoveToTrayAction()]
        gameMovesDebugLog.eventMatched({
            eventType: FigureEventType.leaveBoard,
            ownerFigureId: event.placement.figureId,
            ruleId: 'fallback',
            actions,
            fallback: true,
        })
        return applyActionsWithSpawnedEventDrain(
            figures,
            actions,
            ctx,
            queue,
            applyLeaveBoardAction,
            { catalog, eventRules, boardParameters, onStep, exitHints },
        )
    }

    gameMovesDebugLog.eventMatched({
        eventType: FigureEventType.leaveBoard,
        ownerFigureId: event.placement.figureId,
        ruleId: matched[0].id,
        actions: matched[0].actions,
    })

    return applyActionsWithSpawnedEventDrain(
        figures,
        matched[0].actions,
        ctx,
        queue,
        applyLeaveBoardAction,
        { catalog, eventRules, boardParameters, onStep, exitHints },
    )
}

function processPlaceItem(
    figures: FiguresSlice,
    placement: FigurePlacement,
    coord: CellCoord,
    fromCoord: CellCoord | undefined,
    queue: QueueItem[],
): FiguresSlice {
    const topOccupant = getTopOfStack(figures, coord)

    if (topOccupant && topOccupant.instanceId !== placement.instanceId) {
        queue.unshift({
            stepperPlacement: cloneFigurePlacement(placement),
            stepperCoord: coord,
            stepperOrigin: fromCoord,
            targetPlacement: cloneFigurePlacement(topOccupant),
            targetCoord: coord,
            cause: 'displacement',
        })
    }

    if (fromCoord && placementMatchesAt(figures, fromCoord, placement)) {
        return pushToStack(
            removePlacementFromBoard(figures, placement, fromCoord),
            coord,
            placement,
        )
    }

    return pushToStack(figures, coord, placement)
}

export function drainActionQueue(
    figures: FiguresSlice,
    queue: QueueItem[],
    deps: ActionQueueResolveDeps,
): FiguresSlice {
    const { catalog, eventRules, boardParameters, onStep } = deps

    let nextFigures: FiguresSlice = {
        figuresByCoord: cloneFiguresByCoord(figures.figuresByCoord),
        tray: figures.tray.map(cloneFigurePlacement),
    }

    let guard = 0
    const maxIterations = 256

    while (queue.length > 0 && guard < maxIterations) {
        guard += 1
        const item = queue.shift()!

        if ('kind' in item && item.kind === 'place') {
            gameMovesDebugLog.placeQueue({
                placement: item.placement,
                coord: item.coord,
            })
            nextFigures = processPlaceItem(
                nextFigures,
                item.placement,
                item.coord,
                item.fromCoord,
                queue,
            )
            recordFigureStep(onStep, nextFigures)
            continue
        }

        if ('kind' in item && item.kind === 'leaveBoard') {
            gameMovesDebugLog.leaveBoardQueue({
                placement: item.placement,
                fromCoord: item.fromCoord,
                displaceParams: item.displaceParams,
            })
            nextFigures = processLeaveBoardEvent(
                nextFigures,
                item,
                catalog,
                eventRules,
                boardParameters,
                queue,
                onStep,
            )
            continue
        }

        if ('kind' in item && item.kind === 'displaced') {
            gameMovesDebugLog.displacedQueue({
                placement: item.placement,
                fromCoord: item.fromCoord,
                toCoord: item.toCoord,
                cause: item.cause,
            })
            nextFigures = processDisplacedEvent(
                nextFigures,
                item,
                catalog,
                eventRules,
                boardParameters,
                onStep,
            )
            continue
        }

        gameMovesDebugLog.steppedOnQueue({
            stepper: (item as SteppedOnEvent).stepperPlacement,
            stepperCoord: (item as SteppedOnEvent).stepperCoord,
            target: (item as SteppedOnEvent).targetPlacement,
            targetCoord: (item as SteppedOnEvent).targetCoord,
            cause: (item as SteppedOnEvent).cause,
        })

        nextFigures = processSteppedOnEvent(
            nextFigures,
            item as SteppedOnEvent,
            catalog,
            eventRules,
            boardParameters,
            queue,
            onStep,
        )
    }

    return nextFigures
}

export function resolveActionQueue(
    figures: FiguresSlice,
    initialQueue: QueueItem[],
    catalog: FigureCatalog,
    eventRules: FigureEventRule[],
    boardParameters: BoardParameters,
    onStep?: FigureStepRecorder,
): FiguresSlice {
    return drainActionQueue(
        figures,
        initialQueue.map(item => (
            'kind' in item
                ? { ...item }
                : { ...item }
        )),
        { catalog, eventRules, boardParameters, onStep },
    )
}

export function resolveSteppedOnQueue(
    figures: FiguresSlice,
    initialQueue: SteppedOnEvent[],
    catalog: FigureCatalog,
    eventRules: FigureEventRule[],
    boardParameters: BoardParameters,
    onStep?: FigureStepRecorder,
): FiguresSlice {
    return resolveActionQueue(
        figures,
        initialQueue.map(event => ({ ...event })),
        catalog,
        eventRules,
        boardParameters,
        onStep,
    )
}
