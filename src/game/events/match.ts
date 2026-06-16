import { CellCoord, coordKey, parseCoordKey } from '../types/coords'
import {
    FigureEventAreaCell,
    FigureEventParamsAreaEnteredBy,
    FigureEventParamsEnterCell,
    FigureEventParamsEnterFigureArea,
    FigureEventParamsEnterRect,
    FigureEventParamsStepOnFigure,
    FigureEventRule,
    FigureEventType,
    StepCause,
} from '../types/events'
import { FigureId, FigurePlacement } from '../types/figures'
import {
    normalizeFigureEventParamsAreaEnteredBy,
    normalizeFigureEventParamsEnterFigureArea,
    normalizeFigureEventParamsStepOnFigure,
    resolvePlacementStateIndex,
} from '../figureView'
import { hasFigureAreaCell } from '../figureAreaCells'
import { matchesFigureFilterList } from '../figureFilter'
import { getStackPlacementsByFilter, iterBoardPlacements, matchesStackPosition } from '../figureStack'
import { MoveEventContext, TriggeredFigureEvent } from './types'

type BoardStacks = Record<string, FigurePlacement[]>

function toOneBased(coord: { i: number; j: number }) {
    return { x: coord.i + 1, y: coord.j + 1 }
}

function isSameCell(
    coord: { i: number; j: number },
    x: number,
    y: number,
) {
    const oneBased = toOneBased(coord)
    return oneBased.x === x && oneBased.y === y
}

function isInsideRect(
    coord: { i: number; j: number },
    params: FigureEventParamsEnterRect,
) {
    const { x, y } = toOneBased(coord)
    const xMin = Math.min(params.x1, params.x2)
    const xMax = Math.max(params.x1, params.x2)
    const yMin = Math.min(params.y1, params.y2)
    const yMax = Math.max(params.y1, params.y2)

    return x >= xMin && x <= xMax && y >= yMin && y <= yMax
}

function isInsideFigureArea(
    coord: { i: number; j: number },
    anchor: { i: number; j: number },
    cells: FigureEventAreaCell[],
) {
    const dx = coord.i - anchor.i
    const dy = coord.j - anchor.j

    return hasFigureAreaCell(cells, dx, dy)
}

function normalizeBoardStacks(
    board?: Record<string, FigurePlacement | FigurePlacement[]>,
): BoardStacks {
    if (!board) {
        return {}
    }

    const normalized: BoardStacks = {}

    for (const [key, value] of Object.entries(board)) {
        normalized[key] = Array.isArray(value) ? value : [value]
    }

    return normalized
}

function resolvePlacementCoordBefore(
    placement: FigurePlacement,
    beforeBoard: BoardStacks | undefined,
): CellCoord | undefined {
    if (!beforeBoard) {
        return undefined
    }

    for (const [key, stack] of Object.entries(beforeBoard)) {
        if (stack.some(candidate => candidate.instanceId === placement.instanceId)) {
            return parseCoordKey(key)
        }
    }

    return undefined
}

function isNewlyInArea(
    subjectAfter: CellCoord,
    subjectBefore: CellCoord | undefined,
    anchorAfter: CellCoord,
    anchorBefore: CellCoord | undefined,
    cells: FigureEventAreaCell[],
): boolean {
    if (!isInsideFigureArea(subjectAfter, anchorAfter, cells)) {
        return false
    }

    const beforeCoord = subjectBefore ?? subjectAfter
    const anchorForBefore = anchorBefore ?? anchorAfter

    return !isInsideFigureArea(beforeCoord, anchorForBefore, cells)
}

function matchesStepCause(cause: StepCause | undefined, stepCause: StepCause | undefined): boolean {
    const resolvedCause = cause ?? 'any'
    const resolvedStepCause = stepCause ?? 'manual'

    return resolvedCause === 'any' || resolvedCause === resolvedStepCause
}

function collectFigureAreaAnchors(
    params: FigureEventParamsEnterFigureArea,
    figuresByCoord: BoardStacks,
): Array<{ coord: CellCoord; placement: FigurePlacement }> {
    const normalized = normalizeFigureEventParamsEnterFigureArea(params)
    const anchors: Array<{ coord: CellCoord; placement: FigurePlacement }> = []

    for (const { coord, placement } of iterBoardPlacements(figuresByCoord)) {
        if (!matchesFigureFilterList(
            normalized.anchorFigures,
            placement.figureId,
            resolvePlacementStateIndex(placement),
        )) {
            continue
        }

        anchors.push({ coord, placement })
    }

    return anchors
}

function collectEnterFigureAreaTriggers(
    rule: FigureEventRule,
    ownerFigureId: FigureId,
    ctx: MoveEventContext,
    afterBoard: BoardStacks,
    beforeBoard: BoardStacks | undefined,
): TriggeredFigureEvent[] {
    const params = normalizeFigureEventParamsEnterFigureArea(
        rule.params as FigureEventParamsEnterFigureArea | undefined,
    )

    if (!params.cells?.length) {
        return []
    }

    const triggered: TriggeredFigureEvent[] = []
    const seen = new Set<string>()

    const push = (
        anchorCoord: CellCoord,
        subjectCoord: CellCoord,
        subjectPlacement: FigurePlacement,
        triggerMode: 'active' | 'passive',
    ) => {
        const key = `${ownerFigureId}:${rule.id}:${coordKey(anchorCoord)}:${subjectPlacement.instanceId}`
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        triggered.push({
            ownerFigureId,
            ruleId: rule.id,
            areaAnchor: anchorCoord,
            subjectCoord,
            subjectPlacement,
            triggerMode,
            includePassive: params.includePassive,
        })
    }

    for (const { coord: anchorAfter, placement: anchorPlacement } of collectFigureAreaAnchors(params, afterBoard)) {
        const anchorBefore = resolvePlacementCoordBefore(anchorPlacement, beforeBoard)

        if (ctx.actorPlacement.figureId === ownerFigureId
            && isNewlyInArea(ctx.to, ctx.from, anchorAfter, anchorBefore, params.cells)) {
            push(anchorAfter, ctx.to, ctx.actorPlacement, 'active')
        }

        if (!params.includePassive) {
            continue
        }

        for (const { coord: subjectCoord, placement } of iterBoardPlacements(afterBoard)) {
            if (placement.figureId !== ownerFigureId) {
                continue
            }

            const subjectBefore = resolvePlacementCoordBefore(placement, beforeBoard)

            if (!isNewlyInArea(subjectCoord, subjectBefore, anchorAfter, anchorBefore, params.cells)) {
                continue
            }

            push(anchorAfter, subjectCoord, placement, 'passive')
        }
    }

    return triggered
}

function collectAreaEnteredByTriggers(
    rule: FigureEventRule,
    ownerFigureId: FigureId,
    ctx: MoveEventContext,
    afterBoard: BoardStacks,
    beforeBoard: BoardStacks | undefined,
): TriggeredFigureEvent[] {
    const params = normalizeFigureEventParamsAreaEnteredBy(
        rule.params as FigureEventParamsAreaEnteredBy | undefined,
    )

    if (!params.cells?.length) {
        return []
    }

    if (!matchesStepCause(params.cause, ctx.stepCause)) {
        return []
    }

    const triggered: TriggeredFigureEvent[] = []
    const seen = new Set<string>()

    const push = (
        ownerCoord: CellCoord,
        subjectCoord: CellCoord,
        subjectPlacement: FigurePlacement,
        triggerMode: 'active' | 'passive',
    ) => {
        const key = `${ownerFigureId}:${rule.id}:${coordKey(ownerCoord)}:${subjectPlacement.instanceId}`
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        triggered.push({
            ownerFigureId,
            ruleId: rule.id,
            areaAnchor: ownerCoord,
            subjectCoord,
            subjectPlacement,
            triggerMode,
            includePassive: params.includePassive,
        })
    }

    for (const { coord: ownerAfter, placement: ownerPlacement } of iterBoardPlacements(afterBoard)) {
        if (ownerPlacement.figureId !== ownerFigureId) {
            continue
        }

        const ownerBefore = resolvePlacementCoordBefore(ownerPlacement, beforeBoard)

        if (matchesFigureFilterList(
            params.entererFigures,
            ctx.actorPlacement.figureId,
            resolvePlacementStateIndex(ctx.actorPlacement),
        )
            && isNewlyInArea(ctx.to, ctx.from, ownerAfter, ownerBefore, params.cells)) {
            push(ownerAfter, ctx.to, ctx.actorPlacement, 'active')
        }

        if (!params.includePassive) {
            continue
        }

        for (const { coord: subjectCoord, placement: subjectPlacement } of iterBoardPlacements(afterBoard)) {
            if (!matchesFigureFilterList(
                params.entererFigures,
                subjectPlacement.figureId,
                resolvePlacementStateIndex(subjectPlacement),
            )) {
                continue
            }

            const subjectBefore = resolvePlacementCoordBefore(subjectPlacement, beforeBoard)

            if (!isNewlyInArea(subjectCoord, subjectBefore, ownerAfter, ownerBefore, params.cells)) {
                continue
            }

            push(ownerAfter, subjectCoord, subjectPlacement, 'passive')
        }
    }

    return triggered
}

function collectStepOnFigureTriggers(
    rule: FigureEventRule,
    ownerFigureId: FigureId,
    ctx: MoveEventContext,
    afterBoard: BoardStacks,
): TriggeredFigureEvent[] {
    if (ctx.actorPlacement.figureId !== ownerFigureId) {
        return []
    }

    const params = normalizeFigureEventParamsStepOnFigure(
        rule.params as FigureEventParamsStepOnFigure | undefined,
    )
    const stepCause = ctx.stepCause ?? 'manual'

    if (params.cause !== 'any' && params.cause !== stepCause) {
        return []
    }

    if (ctx.targetAtTo) {
        if (!matchesFigureFilterList(
            params.targetFigures,
            ctx.targetAtTo.figureId,
            resolvePlacementStateIndex(ctx.targetAtTo),
        )) {
            return []
        }

        const stack = afterBoard[coordKey(ctx.to)] ?? []
        const targetIndex = stack.findIndex(item => item.instanceId === ctx.targetAtTo!.instanceId)

        if (targetIndex >= 0 && params.stackTarget && params.stackTarget !== 'all') {
            if (!matchesStackPosition(stack.length, targetIndex, params.stackTarget, params.stackIndex)) {
                return []
            }
        }

        return [{ ownerFigureId, ruleId: rule.id, stepOnTarget: ctx.targetAtTo }]
    }

    const stack = afterBoard[coordKey(ctx.to)] ?? []
    const targets = getStackPlacementsByFilter(
        stack,
        params.stackTarget ?? 'all',
        params.stackIndex ?? 0,
        placement => matchesFigureFilterList(
            params.targetFigures,
            placement.figureId,
            resolvePlacementStateIndex(placement),
        ),
    )

    return targets.map(stepOnTarget => ({
        ownerFigureId,
        ruleId: rule.id,
        stepOnTarget,
    }))
}

export function matchesFigureEvent(
    rule: FigureEventRule,
    ownerFigureId: FigureId,
    ctx: MoveEventContext,
): boolean {
    switch (rule.type) {
        case FigureEventType.steppedOnBy:
        case FigureEventType.leaveBoard:
        case FigureEventType.enterFigureArea:
        case FigureEventType.areaEnteredBy:
        case FigureEventType.stepOnFigure:
            return false
        case FigureEventType.enterCell: {
            const params = rule.params as FigureEventParamsEnterCell | undefined
            if (!params) {
                return false
            }

            return ctx.actorPlacement.figureId === ownerFigureId
                && isSameCell(ctx.to, params.x, params.y)
        }
        case FigureEventType.leaveCell: {
            const params = rule.params as FigureEventParamsEnterCell | undefined
            if (!params) {
                return false
            }

            return ctx.actorPlacement.figureId === ownerFigureId
                && isSameCell(ctx.from, params.x, params.y)
        }
        case FigureEventType.enterRect: {
            const params = rule.params as FigureEventParamsEnterRect | undefined
            if (!params) {
                return false
            }

            return ctx.actorPlacement.figureId === ownerFigureId
                && isInsideRect(ctx.to, params)
        }
        default:
            return false
    }
}

export function collectTriggeredFigureEvents(
    ctx: MoveEventContext,
    figuresByCoord: BoardStacks,
): TriggeredFigureEvent[] {
    const triggered: TriggeredFigureEvent[] = []
    const seen = new Set<string>()
    const beforeBoard = normalizeBoardStacks(ctx.figuresBeforeMove)

    const push = (event: TriggeredFigureEvent) => {
        const anchorPart = event.areaAnchor ? coordKey(event.areaAnchor) : ''
        const subjectPart = event.subjectPlacement?.instanceId
            ?? event.stepOnTarget?.instanceId
            ?? ''
        const key = `${event.ownerFigureId}:${event.ruleId}:${anchorPart}:${subjectPart}`
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        triggered.push(event)
    }

    for (const entry of ctx.catalog) {
        const rules = entry.eventRules ?? []

        for (const rule of rules) {
            if (rule.type === FigureEventType.steppedOnBy || rule.type === FigureEventType.leaveBoard) {
                continue
            }

            if (rule.type === FigureEventType.enterFigureArea) {
                for (const event of collectEnterFigureAreaTriggers(
                    rule,
                    entry.id,
                    ctx,
                    figuresByCoord,
                    beforeBoard,
                )) {
                    push(event)
                }
                continue
            }

            if (rule.type === FigureEventType.areaEnteredBy) {
                for (const event of collectAreaEnteredByTriggers(
                    rule,
                    entry.id,
                    ctx,
                    figuresByCoord,
                    beforeBoard,
                )) {
                    push(event)
                }
                continue
            }

            if (rule.type === FigureEventType.stepOnFigure) {
                for (const event of collectStepOnFigureTriggers(rule, entry.id, ctx, figuresByCoord)) {
                    push(event)
                }
                continue
            }

            if (matchesFigureEvent(rule, entry.id, ctx)) {
                push({
                    ownerFigureId: entry.id,
                    ruleId: rule.id,
                })
            }
        }
    }

    return triggered
}
