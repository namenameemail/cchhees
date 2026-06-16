import { FigureCatalog } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import { cloneFigurePlacement } from '../figureView'
import { cloneFiguresByCoord } from '../figureStack'
import { collectTriggeredFigureEvents } from './match'
import { applyGameActions } from './execute'
import { MoveEventContext } from './types'
import { recordFigureStep } from '../figureAnimation/figureStepRecorder'
import { gameMovesDebugLog } from '../gameMovesDebugLog'
import { logFigureEventRuntime } from '../figureEventRulesDebugLog'
import { resolveActionQueue, SteppedOnQueueItem } from './steppedOnQueue'

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
                ownerFigureId: event.ownerFigureId,
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

    const catalogById = new Map<FigureCatalog[number]['id'], FigureCatalog[number]>(
        ctx.catalog.map(entry => [entry.id, entry]),
    )
    const deferredQueue: SteppedOnQueueItem[] = []

    for (const event of triggered) {
        const definition = catalogById.get(event.ownerFigureId)
        const rule = definition?.eventRules?.find(item => item.id === event.ruleId)

        if (!rule) {
            continue
        }

        gameMovesDebugLog.figureEvent({
            eventType: rule.type,
            ownerFigureId: event.ownerFigureId,
            ruleId: event.ruleId,
            actions: rule.actions,
            areaAnchor: event.areaAnchor,
        })

        logFigureEventRuntime({
            phase: 'trigger',
            eventType: rule.type,
            ownerFigureId: event.ownerFigureId,
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
            ownerFigureId: event.ownerFigureId,
            targetAtTo: event.stepOnTarget ?? ctx.targetAtTo,
        }

        logFigureEventRuntime({
            phase: 'apply-start',
            eventType: rule.type,
            ownerFigureId: event.ownerFigureId,
            ruleId: event.ruleId,
            actions: rule.actions,
            areaAnchor: event.areaAnchor,
        })

        nextFigures = applyGameActions(nextFigures, rule.actions, actionCtx, deferredQueue)
        recordFigureStep(ctx.onStep, nextFigures)

        logFigureEventRuntime({
            phase: 'apply-done',
            eventType: rule.type,
            ownerFigureId: event.ownerFigureId,
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
            },
        })
        nextFigures = resolveActionQueue(
            nextFigures,
            deferredQueue,
            ctx.catalog,
            ctx.boardParameters,
            ctx.onStep,
        )
        recordFigureStep(ctx.onStep, nextFigures)
    }

    return nextFigures
}
