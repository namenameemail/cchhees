import { FiguresSlice } from '../state/slices'
import { cloneFigurePlacement } from '../figureView'
import { cloneFiguresByCoord } from '../figureStack'
import { collectTriggeredFigureEvents } from './match'
import { applyGameActions } from './execute'
import { MoveEventContext } from './types'
import { recordFigureStep } from '../figureAnimation/figureStepRecorder'
import { gameMovesDebugLog } from '../gameMovesDebugLog'
import { logFigureEventRuntime } from '../figureEventRulesDebugLog'
import { drainActionQueue, SteppedOnQueueItem } from './steppedOnQueue'
import { resolveEventRule } from './migrateEventRules'

function resolveRuleOwnerFigureId(
    ctx: MoveEventContext,
    event: ReturnType<typeof collectTriggeredFigureEvents>[number],
): string | undefined {
    return event.subjectPlacement?.figureId
        ?? event.stepOnTarget?.figureId
        ?? ctx.areaSubjectPlacement?.figureId
        ?? ctx.actorPlacement.figureId
}

export function runFigureEvents(
    figures: FiguresSlice,
    ctx: MoveEventContext,
): FiguresSlice {
    const triggered = collectTriggeredFigureEvents(ctx, figures.figuresByCoord)

    logFigureEventRuntime({
        phase: 'collect',
        eventType: '—',
        ownerFigureId: ctx.actorPlacement.figureId,
        ruleId: '—',
        detail: {
            count: triggered.length,
            from: ctx.from,
            to: ctx.to,
            triggered: triggered.map(event => ({
                ruleId: event.ruleId,
                areaAnchor: event.areaAnchor,
                subjectCoord: event.subjectCoord,
                triggerMode: event.triggerMode,
                includePassive: event.includePassive,
            })),
        },
    })

    let nextFigures: FiguresSlice = {
        figuresByCoord: cloneFiguresByCoord(figures.figuresByCoord),
        tray: figures.tray.map(cloneFigurePlacement),
    }

    const rulesById = new Map(
        ctx.eventRules.map(rawRule => {
            const rule = resolveEventRule(rawRule)
            return [rule.id, rule]
        }),
    )
    const deferredQueue: SteppedOnQueueItem[] = []

    for (const event of triggered) {
        const rule = rulesById.get(event.ruleId)

        if (!rule) {
            continue
        }

        const ownerFigureId = resolveRuleOwnerFigureId(ctx, event) ?? ctx.actorPlacement.figureId

        gameMovesDebugLog.figureEvent({
            eventType: rule.type,
            ownerFigureId,
            ruleId: event.ruleId,
            actions: rule.actions,
            areaAnchor: event.areaAnchor,
        })

        logFigureEventRuntime({
            phase: 'trigger',
            eventType: rule.type,
            ownerFigureId,
            ruleId: event.ruleId,
            actions: rule.actions,
            areaAnchor: event.areaAnchor,
            detail: {
                subjectCoord: event.subjectCoord,
                triggerMode: event.triggerMode,
                includePassive: event.includePassive,
            },
        })

        const actionCtx: MoveEventContext = {
            ...ctx,
            areaAnchor: event.areaAnchor,
            eventType: rule.type,
            areaSubjectCoord: event.subjectCoord,
            areaSubjectPlacement: event.subjectPlacement,
            ownerFigureId,
            targetAtTo: event.stepOnTarget ?? ctx.targetAtTo,
            triggerConditionType: event.triggerConditionType,
        }

        logFigureEventRuntime({
            phase: 'apply-start',
            eventType: rule.type,
            ownerFigureId,
            ruleId: event.ruleId,
            actions: rule.actions,
            areaAnchor: event.areaAnchor,
        })

        nextFigures = applyGameActions(nextFigures, rule.actions, actionCtx, deferredQueue)

        logFigureEventRuntime({
            phase: 'apply-done',
            eventType: rule.type,
            ownerFigureId,
            ruleId: event.ruleId,
            actions: rule.actions,
            areaAnchor: event.areaAnchor,
            detail: {
                deferredQueueSize: deferredQueue.length,
            },
        })
    }

    if (deferredQueue.length > 0) {
        logFigureEventRuntime({
            phase: 'resolve-queue',
            eventType: '—',
            ownerFigureId: ctx.actorPlacement.figureId,
            ruleId: '—',
            detail: {
                queueSize: deferredQueue.length,
                unexpected: true,
            },
        })
        nextFigures = drainActionQueue(
            nextFigures,
            deferredQueue,
            {
                catalog: ctx.catalog,
                eventRules: ctx.eventRules,
                boardParameters: ctx.boardParameters,
                onStep: ctx.onStep,
            },
        )
        recordFigureStep(ctx.onStep, nextFigures)
    }

    return nextFigures
}
