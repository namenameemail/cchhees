import { FigureEventRule, FigureEventType } from '../types/events'
import { MoveEventContext, TriggeredFigureEvent } from './types'
import { evaluateOnMoveRule } from './conditions/evaluate'
import { resolveEventRule } from './migrateEventRules'
import { BoardStacks } from './geometry'

export function collectTriggeredFigureEvents(
    ctx: MoveEventContext,
    figuresByCoord: BoardStacks,
): TriggeredFigureEvent[] {
    const triggered: TriggeredFigureEvent[] = []
    const seen = new Set<string>()

    const push = (ruleId: string, match: Partial<TriggeredFigureEvent>) => {
        const anchorPart = match.areaAnchor ? `${match.areaAnchor.i},${match.areaAnchor.j}` : ''
        const subjectPart = match.subjectPlacement?.instanceId
            ?? match.stepOnTarget?.instanceId
            ?? ''
        const key = `${ruleId}:${anchorPart}:${subjectPart}`
        if (seen.has(key)) {
            return
        }
        seen.add(key)
        triggered.push({
            ruleId,
            ...match,
        })
    }

    for (const rawRule of ctx.eventRules) {
        const rule = resolveEventRule(rawRule)

        if (rule.type !== FigureEventType.onMove) {
            continue
        }

        const matches = evaluateOnMoveRule(rule, ctx, figuresByCoord)

        for (const match of matches) {
            push(rule.id, {
                areaAnchor: match.areaAnchor,
                subjectCoord: match.subjectCoord,
                subjectPlacement: match.subjectPlacement,
                stepOnTarget: match.stepOnTarget,
                triggerMode: match.triggerMode,
                includePassive: match.includePassive,
                triggerConditionType: match.triggerConditionType,
            })
        }
    }

    return triggered
}
