import { profiler, profileDebug, isProfilerPanelChannel } from '../profiler'
import { FigureEventRule, GameAction } from './types/events'
import { FigureId } from './types/figures'

const MAX_EVENTS = 80
const MAX_CONSOLE_LINES = 120
const CONSOLE_PREFIX = '[events] '

export type FigureEventRulesDebugEvent = {
    at: number
    action: string
    figureId?: FigureId
    ruleId?: string
    ruleIndex?: number
    before?: unknown
    after?: unknown
    detail?: Record<string, unknown>
}

const events: FigureEventRulesDebugEvent[] = []

if (typeof window !== 'undefined') {
    (window as Window & { __FIGURE_EVENT_RULES_DEBUG__?: FigureEventRulesDebugEvent[] })
        .__FIGURE_EVENT_RULES_DEBUG__ = []
}

function enabled(): boolean {
    return import.meta.env.DEV
}

function trimConsoleLines(): void {
    const lines = profiler.getPanelLines('console')
    const eventLines = lines.filter(line => line.startsWith(CONSOLE_PREFIX))

    if (eventLines.length <= MAX_CONSOLE_LINES) {
        return
    }

    const otherLines = lines.filter(line => !line.startsWith(CONSOLE_PREFIX))
    profiler.setPanelText('console', [...otherLines, ...eventLines.slice(-MAX_CONSOLE_LINES)].join('\n'))
}

function summarizeRule(rule: FigureEventRule | undefined) {
    if (!rule) {
        return null
    }

    return {
        id: rule.id,
        type: rule.type,
        actions: rule.actions?.map(action => ({
            type: action.type,
            params: action.params,
        })),
    }
}

function summarizeRules(rules: FigureEventRule[] | undefined) {
    return rules?.map(summarizeRule)
}

function pushEvent(event: Omit<FigureEventRulesDebugEvent, 'at'>) {
    if (!enabled()) {
        return
    }

    const entry: FigureEventRulesDebugEvent = { at: Date.now(), ...event }

    events.push(entry)

    if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS)
    }

    const detailText = event.detail != null
        ? ` ${JSON.stringify(event.detail)}`
        : ''

    const line = `${CONSOLE_PREFIX}${event.action}`
        + (event.figureId ? ` figure=${event.figureId}` : '')
        + (event.ruleId ? ` rule=${event.ruleId.slice(0, 8)}` : '')
        + (event.ruleIndex != null ? ` idx=${event.ruleIndex}` : '')
        + detailText

    console.log(line)

    if (typeof window !== 'undefined') {
        (window as Window & { __FIGURE_EVENT_RULES_DEBUG__?: FigureEventRulesDebugEvent[] })
            .__FIGURE_EVENT_RULES_DEBUG__ = [...events]
    }

    if (isProfilerPanelChannel('events')) {
        profiler.appendPanelText('console', line)
        trimConsoleLines()
    }

    profileDebug('events', event.action.slice(0, 160), {
        figureId: event.figureId,
        ruleId: event.ruleId,
        ruleIndex: event.ruleIndex,
        ...event.detail,
    })

    if (profiler.isRecording) {
        profiler.log(`events ${event.action}`, {
            figureId: event.figureId,
            ruleId: event.ruleId,
            ruleIndex: event.ruleIndex,
            before: event.before,
            after: event.after,
            detail: event.detail,
        })
        profiler.flushLatest('events')
    }
}

export function logFigureEventRulesDebug(
    action: string,
    payload: Omit<FigureEventRulesDebugEvent, 'at' | 'action'> = {},
) {
    pushEvent({ action, ...payload })
}

export function getFigureEventRulesDebugEvents(): FigureEventRulesDebugEvent[] {
    return [...events]
}

export function logFigureEventRulesBatchChange(input: {
    figureId?: FigureId
    phase: 'before-normalize' | 'after-save'
    rules: FigureEventRule[]
    normalizeDropped?: Array<{ ruleId: string; index: number; reason: string }>
}) {
    logFigureEventRulesDebug(`rules-${input.phase}`, {
        figureId: input.figureId,
        after: summarizeRules(input.rules),
        detail: {
            count: input.rules.length,
            normalizeDropped: input.normalizeDropped,
        },
    })
}

export function logFigureEventActionsChange(input: {
    figureId?: FigureId
    rule: FigureEventRule
    ruleIndex: number
    before: GameAction[]
    after: GameAction[]
}) {
    logFigureEventRulesDebug('actions-change', {
        figureId: input.figureId,
        ruleId: input.rule.id,
        ruleIndex: input.ruleIndex,
        before: input.before.map(action => ({ type: action.type, params: action.params })),
        after: input.after.map(action => ({ type: action.type, params: action.params })),
    })
}

export function logFigureEventRuntime(input: {
    phase: 'collect' | 'trigger' | 'apply-start' | 'apply-done' | 'resolve-queue'
    eventType: string
    ownerFigureId: FigureId
    ruleId: string
    actions?: GameAction[]
    areaAnchor?: { i: number; j: number }
    detail?: Record<string, unknown>
}) {
    logFigureEventRulesDebug(`runtime-${input.phase}`, {
        figureId: input.ownerFigureId,
        ruleId: input.ruleId,
        detail: {
            eventType: input.eventType,
            actions: input.actions?.map(action => ({ type: action.type, params: action.params })),
            areaAnchor: input.areaAnchor,
            ...input.detail,
        },
    })
}
