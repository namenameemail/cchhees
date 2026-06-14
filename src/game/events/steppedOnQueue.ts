import { BoardParameters } from '../types/boardParameters'
import { CellCoord, coordKey, isCoordInGrid } from '../types/coords'
import {
    DisplaceFigureActionParams,
    FigureEventParamsSteppedOnBy,
    FigureEventRule,
    FigureEventType,
    GameAction,
    GameActionType,
    StepCause,
} from '../types/events'
import { FigureCatalog, FigureId, FigurePlacement } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import { cloneFigurePlacement, placementsMatch, placementMatchesAt, resolvePlacementStateIndex } from '../figureView'
import { matchesFigureFilter, normalizeStoredFigureFilterId } from '../figureFilter'
import { applyLeaveBoardAction, applySteppedOnAction } from './execute'
import { gameMovesDebugLog } from '../gameMovesDebugLog'
import { runFigureEvents } from './runFigureEvents'

export interface SteppedOnEvent {
    stepperPlacement: FigurePlacement
    stepperCoord: CellCoord
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
}

export interface DeferredPlacement {
    placement: FigurePlacement
    coord: CellCoord
}

export type PlaceQueueItem = {
    kind: 'place'
    placement: FigurePlacement
    coord: CellCoord
    fromCoord?: CellCoord
}

export type SteppedOnQueueItem = SteppedOnEvent | LeaveBoardQueueEvent | PlaceQueueItem

export interface LeaveBoardQueueEvent {
    kind: 'leaveBoard'
    placement: FigurePlacement
    fromCoord: CellCoord
    displaceParams?: DisplaceFigureActionParams
}

type QueueItem = SteppedOnQueueItem

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
    ownerFigureId: FigureId,
    event: SteppedOnEvent,
): boolean {
    if (rule.type !== FigureEventType.steppedOnBy) {
        return false
    }

    if (event.targetPlacement.figureId !== ownerFigureId) {
        return false
    }

    const params = normalizeSteppedOnParams(rule.params as FigureEventParamsSteppedOnBy | undefined)

    if (!matchesFigureFilter(params.stepperFigureId, event.stepperPlacement.figureId)) {
        return false
    }

    if (params.stepperStateIndex !== undefined) {
        const stepperState = resolvePlacementStateIndex(event.stepperPlacement)
        if (stepperState !== params.stepperStateIndex) {
            return false
        }
    }

    const cause = params.cause ?? 'any'
    if (cause !== 'any' && cause !== event.cause) {
        return false
    }

    return true
}

function normalizeSteppedOnParams(
    params?: FigureEventParamsSteppedOnBy,
): FigureEventParamsSteppedOnBy {
    const normalized: FigureEventParamsSteppedOnBy = {}

    const filterId = normalizeStoredFigureFilterId(params?.stepperFigureId)

    if (filterId !== undefined) {
        normalized.stepperFigureId = filterId
    }

    if (params?.stepperStateIndex !== undefined && Number.isFinite(params.stepperStateIndex)) {
        normalized.stepperStateIndex = Math.max(0, Math.trunc(params.stepperStateIndex))
    }

    if (params?.cause === 'manual' || params?.cause === 'displacement') {
        normalized.cause = params.cause
    } else {
        normalized.cause = 'any'
    }

    return normalized
}

function findMatchingSteppedOnRules(
    event: SteppedOnEvent,
    catalog: FigureCatalog,
): Array<{ ownerFigureId: FigureId; rule: FigureEventRule }> {
    const matched: Array<{ ownerFigureId: FigureId; rule: FigureEventRule }> = []

    for (const entry of catalog) {
        for (const rule of entry.eventRules ?? []) {
            if (matchesSteppedOnBy(rule, entry.id, event)) {
                matched.push({ ownerFigureId: entry.id, rule })
            }
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
): FiguresSlice {
    return actions.reduce((current, action) => {
        return applySteppedOnAction(current, action, ctx, queue)
    }, figures)
}

function applyStepOnFigureEventsForStepper(
    figures: FiguresSlice,
    event: SteppedOnEvent,
    catalog: FigureCatalog,
    boardParameters: BoardParameters,
): FiguresSlice {
    if (event.cause !== 'displacement') {
        return figures
    }

    return runFigureEvents(figures, {
        from: event.stepperCoord,
        to: event.targetCoord,
        actorPlacement: event.stepperPlacement,
        targetAtTo: event.targetPlacement,
        boardParameters,
        catalog,
        stepCause: 'displacement',
        stepperPlacement: event.stepperPlacement,
        stepperCoord: event.stepperCoord,
    })
}

function processSteppedOnEvent(
    figures: FiguresSlice,
    event: SteppedOnEvent,
    catalog: FigureCatalog,
    boardParameters: BoardParameters,
    queue: QueueItem[],
): FiguresSlice {
    const matched = findMatchingSteppedOnRules(event, catalog)
    const ctx: SteppedOnActionContext = {
        stepperPlacement: event.stepperPlacement,
        stepperCoord: event.stepperCoord,
        targetPlacement: event.targetPlacement,
        targetCoord: event.targetCoord,
        stepCause: event.cause,
        boardParameters,
        catalog,
    }

    let nextFigures = figures

    if (matched.length === 0) {
        if (event.cause === 'manual' || event.cause === 'displacement') {
            const actions = [getFallbackMoveToTrayAction()]
            gameMovesDebugLog.eventMatched({
                eventType: FigureEventType.steppedOnBy,
                ownerFigureId: event.targetPlacement.figureId,
                ruleId: 'fallback',
                actions,
                fallback: true,
                context: `stepper=${event.stepperPlacement.figureId} cause=${event.cause}`,
            })
            nextFigures = applySteppedOnActions(figures, actions, ctx, queue)
        }
    } else {
        gameMovesDebugLog.eventMatched({
            eventType: matched[0].rule.type,
            ownerFigureId: matched[0].ownerFigureId,
            ruleId: matched[0].rule.id,
            actions: matched[0].rule.actions,
            context: `stepper=${event.stepperPlacement.figureId} cause=${event.cause}`,
        })

        nextFigures = applySteppedOnActions(figures, matched[0].rule.actions, ctx, queue)
    }

    return applyStepOnFigureEventsForStepper(nextFigures, event, catalog, boardParameters)
}

function processLeaveBoardEvent(
    figures: FiguresSlice,
    event: LeaveBoardQueueEvent,
    catalog: FigureCatalog,
    boardParameters: BoardParameters,
    queue: QueueItem[],
): FiguresSlice {
    const matched: FigureEventRule[] = []

    for (const entry of catalog) {
        if (event.placement.figureId !== entry.id) {
            continue
        }

        for (const rule of entry.eventRules ?? []) {
            if (rule.type === FigureEventType.leaveBoard) {
                matched.push(rule)
            }
        }
    }

    const ctx = {
        placement: event.placement,
        fromCoord: event.fromCoord,
        boardParameters,
        catalog,
        displaceParams: event.displaceParams,
    }

    if (matched.length === 0) {
        const actions = [getFallbackMoveToTrayAction()]
        gameMovesDebugLog.eventMatched({
            eventType: FigureEventType.leaveBoard,
            ownerFigureId: event.placement.figureId,
            ruleId: 'fallback',
            actions,
            fallback: true,
        })
        return applyLeaveBoardAction(figures, actions[0], ctx, queue)
    }

    gameMovesDebugLog.eventMatched({
        eventType: FigureEventType.leaveBoard,
        ownerFigureId: event.placement.figureId,
        ruleId: matched[0].id,
        actions: matched[0].actions,
    })

    return matched[0].actions.reduce(
        (current, action) => applyLeaveBoardAction(current, action, ctx, queue),
        figures,
    )
}

function processPlaceItem(
    figures: FiguresSlice,
    placement: FigurePlacement,
    coord: CellCoord,
    fromCoord: CellCoord | undefined,
    queue: QueueItem[],
): FiguresSlice {
    const landingKey = coordKey(coord)
    const occupant = figures.figuresByCoord[landingKey]

    if (occupant) {
        queue.unshift({
            stepperPlacement: cloneFigurePlacement(placement),
            stepperCoord: coord,
            targetPlacement: cloneFigurePlacement(occupant),
            targetCoord: coord,
            cause: 'displacement',
        })
        return figures
    }

    const figuresByCoord = { ...figures.figuresByCoord }

    if (fromCoord) {
        const fromKey = coordKey(fromCoord)

        if (placementMatchesAt(figuresByCoord, fromCoord, placement)) {
            delete figuresByCoord[fromKey]
        }
    }

    figuresByCoord[landingKey] = cloneFigurePlacement(placement)

    return {
        ...figures,
        figuresByCoord,
    }
}

export function resolveSteppedOnQueue(
    figures: FiguresSlice,
    initialQueue: SteppedOnEvent[],
    catalog: FigureCatalog,
    boardParameters: BoardParameters,
): FiguresSlice {
    const queue: QueueItem[] = initialQueue.map(event => ({ ...event }))

    let nextFigures: FiguresSlice = {
        figuresByCoord: Object.fromEntries(
            Object.entries(figures.figuresByCoord).map(([key, placement]) => [
                key,
                cloneFigurePlacement(placement),
            ]),
        ),
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
                boardParameters,
                queue,
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
            boardParameters,
            queue,
        )
    }

    return nextFigures
}
