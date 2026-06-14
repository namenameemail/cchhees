import { coordKey } from '../types/coords'
import {
    FigureEventParamsEnterCell,
    FigureEventParamsEnterFigureArea,
    FigureEventParamsEnterRect,
    FigureEventParamsStepOnFigure,
    FigureEventRule,
    FigureEventType,
} from '../types/events'
import { FigureId } from '../types/figures'
import { resolvePlacementStateIndex } from '../figureView'
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
    params: FigureEventParamsEnterFigureArea,
) {
    const halfWidth = Math.max(0, Math.trunc(params.halfWidth ?? 0))
    const halfHeight = Math.max(0, Math.trunc(params.halfHeight ?? 0))

    return coord.i >= anchor.i - halfWidth
        && coord.i <= anchor.i + halfWidth
        && coord.j >= anchor.j - halfHeight
        && coord.j <= anchor.j + halfHeight
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
            return false
        case FigureEventType.stepOnFigure: {
            if (ctx.actorPlacement.figureId !== ownerFigureId || ctx.targetAtTo == null) {
                return false
            }

            const params = rule.params as FigureEventParamsStepOnFigure | undefined
            const cause = params?.cause ?? 'any'
            const stepCause = ctx.stepCause ?? 'manual'

            if (cause !== 'any' && cause !== stepCause) {
                return false
            }

            if (params?.targetFigureId && ctx.targetAtTo.figureId !== params.targetFigureId) {
                return false
            }

            if (params?.targetStateIndex !== undefined) {
                const targetState = resolvePlacementStateIndex(ctx.targetAtTo)
                if (targetState !== params.targetStateIndex) {
                    return false
                }
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
        case FigureEventType.enterFigureArea: {
            const params = rule.params as FigureEventParamsEnterFigureArea | undefined
            if (!params || !anchorCoord) {
                return false
            }

            return ctx.actorPlacement.figureId === ownerFigureId
                && isInsideFigureArea(ctx.to, anchorCoord, params)
        }
        default:
            return false
    }
}

export function collectFigureAreaAnchors(
    params: FigureEventParamsEnterFigureArea,
    figuresByCoord: Record<string, { figureId: FigureId }>,
): Array<{ i: number; j: number }> {
    const anchors: Array<{ i: number; j: number }> = []

    for (const [key, placement] of Object.entries(figuresByCoord)) {
        if (placement.figureId !== params.figureId) {
            continue
        }

        const [i, j] = key.split(',').map(Number)
        anchors.push({ i, j })
    }

    return anchors
}

export function collectTriggeredFigureEvents(
    ctx: MoveEventContext,
    figuresByCoord: Record<string, { figureId: FigureId }>,
): TriggeredFigureEvent[] {
    const triggered: TriggeredFigureEvent[] = []
    const seen = new Set<string>()

    const push = (ownerFigureId: FigureId, rule: FigureEventRule, areaAnchor?: { i: number; j: number }) => {
        const key = `${ownerFigureId}:${rule.id}:${areaAnchor ? coordKey(areaAnchor) : ''}`
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        triggered.push({
            ownerFigureId,
            ruleId: rule.id,
            areaAnchor,
        })
    }

    for (const entry of ctx.catalog) {
        const rules = entry.eventRules ?? []

        for (const rule of rules) {
            if (rule.type === FigureEventType.steppedOnBy || rule.type === FigureEventType.leaveBoard) {
                continue
            }

            if (rule.type === FigureEventType.enterFigureArea) {
                const params = rule.params as FigureEventParamsEnterFigureArea | undefined
                if (!params) {
                    continue
                }

                const anchors = collectFigureAreaAnchors(params, figuresByCoord)
                for (const anchor of anchors) {
                    if (matchesFigureEvent(rule, entry.id, ctx, anchor)) {
                        push(entry.id, rule, anchor)
                    }
                }
                continue
            }

            if (matchesFigureEvent(rule, entry.id, ctx)) {
                push(entry.id, rule)
            }
        }
    }

    return triggered
}
