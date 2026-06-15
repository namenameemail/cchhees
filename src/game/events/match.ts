import { CellCoord, coordKey } from '../types/coords'
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
import { MoveEventContext, TriggeredFigureEvent } from './types'

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

function parseCoordKey(key: string): CellCoord {
    const [i, j] = key.split(',').map(Number)
    return { i, j }
}

function resolvePlacementCoordBefore(
    placement: FigurePlacement,
    beforeBoard: Record<string, FigurePlacement> | undefined,
): CellCoord | undefined {
    if (!beforeBoard) {
        return undefined
    }

    for (const [key, candidate] of Object.entries(beforeBoard)) {
        if (candidate.instanceId === placement.instanceId) {
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
    figuresByCoord: Record<string, FigurePlacement>,
): Array<{ coord: CellCoord; placement: FigurePlacement }> {
    const normalized = normalizeFigureEventParamsEnterFigureArea(params)
    const anchors: Array<{ coord: CellCoord; placement: FigurePlacement }> = []

    for (const [key, placement] of Object.entries(figuresByCoord)) {
        if (!matchesFigureFilterList(
            normalized.anchorFigures,
            placement.figureId,
            resolvePlacementStateIndex(placement),
        )) {
            continue
        }

        anchors.push({
            coord: parseCoordKey(key),
            placement,
        })
    }

    return anchors
}

function collectEnterFigureAreaTriggers(
    rule: FigureEventRule,
    ownerFigureId: FigureId,
    ctx: MoveEventContext,
    afterBoard: Record<string, FigurePlacement>,
    beforeBoard: Record<string, FigurePlacement> | undefined,
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

        for (const [key, placement] of Object.entries(afterBoard)) {
            if (placement.figureId !== ownerFigureId) {
                continue
            }

            const subjectCoord = parseCoordKey(key)
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
    afterBoard: Record<string, FigurePlacement>,
    beforeBoard: Record<string, FigurePlacement> | undefined,
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

    for (const [ownerKey, ownerPlacement] of Object.entries(afterBoard)) {
        if (ownerPlacement.figureId !== ownerFigureId) {
            continue
        }

        const ownerAfter = parseCoordKey(ownerKey)
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

        for (const [subjectKey, subjectPlacement] of Object.entries(afterBoard)) {
            if (!matchesFigureFilterList(
                params.entererFigures,
                subjectPlacement.figureId,
                resolvePlacementStateIndex(subjectPlacement),
            )) {
                continue
            }

            const subjectCoord = parseCoordKey(subjectKey)
            const subjectBefore = resolvePlacementCoordBefore(subjectPlacement, beforeBoard)

            if (!isNewlyInArea(subjectCoord, subjectBefore, ownerAfter, ownerBefore, params.cells)) {
                continue
            }

            push(ownerAfter, subjectCoord, subjectPlacement, 'passive')
        }
    }

    return triggered
}

export function matchesFigureEvent(
    rule: FigureEventRule,
    ownerFigureId: FigureId,
    ctx: MoveEventContext,
    anchorCoord?: { i: number; j: number },
): boolean {
    switch (rule.type) {
        case FigureEventType.steppedOnBy:
        case FigureEventType.leaveBoard:
        case FigureEventType.enterFigureArea:
        case FigureEventType.areaEnteredBy:
            return false
        case FigureEventType.stepOnFigure: {
            if (ctx.actorPlacement.figureId !== ownerFigureId || ctx.targetAtTo == null) {
                return false
            }

            const params = normalizeFigureEventParamsStepOnFigure(
                rule.params as FigureEventParamsStepOnFigure | undefined,
            )
            const cause = params?.cause ?? 'any'
            const stepCause = ctx.stepCause ?? 'manual'

            if (cause !== 'any' && cause !== stepCause) {
                return false
            }

            if (!matchesFigureFilterList(
                params?.targetFigures,
                ctx.targetAtTo.figureId,
                resolvePlacementStateIndex(ctx.targetAtTo),
            )) {
                return false
            }

            return true
        }
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
    figuresByCoord: Record<string, FigurePlacement>,
): TriggeredFigureEvent[] {
    const triggered: TriggeredFigureEvent[] = []
    const seen = new Set<string>()
    const beforeBoard = ctx.figuresBeforeMove

    const push = (event: TriggeredFigureEvent) => {
        const anchorPart = event.areaAnchor ? coordKey(event.areaAnchor) : ''
        const subjectPart = event.subjectPlacement?.instanceId ?? ''
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
