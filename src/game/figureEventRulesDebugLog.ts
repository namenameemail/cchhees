import { isDebugEnabled } from '../channelDebugLog'
import { profiler } from '../profiler'
import { FigureEventCondition, FigureEventRule, GameAction } from './types/events'
import { FigureId } from './types/figures'

const MAX_EVENTS = 120
const CONSOLE_PREFIX = '[figure-events] '

const PROFILE_ACTIONS = new Set([
    'conditions-change',
    'condition-dropped',
    'conditions-normalize-diff',
    'normalize-rejected',
])

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

function summarizeCondition(condition: FigureEventCondition | undefined) {
    if (!condition) {
        return null
    }

    return {
        type: condition.type,
        subject: condition.subject,
        params: condition.params,
    }
}

function summarizeRule(rule: FigureEventRule | undefined) {
    if (!rule) {
        return null
    }

    return {
        id: rule.id,
        type: rule.type,
        params: rule.params,
        conditions: rule.conditions?.map(summarizeCondition),
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
    if (!isDebugEnabled()) {
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

    if (PROFILE_ACTIONS.has(event.action)) {
        profiler.log(`events ${event.action}`, {
            figureId: event.figureId,
            ruleId: event.ruleId,
            ruleIndex: event.ruleIndex,
            before: event.before,
            after: event.after,
            ...event.detail,
        })
    }

    if (typeof window !== 'undefined') {
        (window as Window & { __FIGURE_EVENT_RULES_DEBUG__?: FigureEventRulesDebugEvent[] })
            .__FIGURE_EVENT_RULES_DEBUG__ = [...events]
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

export function logFigureConditionDropped(input: {
    figureId?: FigureId
    ruleId?: string
    ruleIndex?: number
    conditionIndex: number
    condition: FigureEventCondition
    reason: string
}) {
    logFigureEventRulesDebug('condition-dropped', {
        figureId: input.figureId,
        ruleId: input.ruleId,
        ruleIndex: input.ruleIndex,
        before: summarizeCondition(input.condition),
        detail: {
            conditionIndex: input.conditionIndex,
            reason: input.reason,
            subjectEntries: input.condition.subject?.entries,
            subjectMatchMode: input.condition.subject?.matchMode,
            conditionType: input.condition.type,
        },
    })
}

export function logFigureConditionsNormalize(input: {
    figureId?: FigureId
    ruleId?: string
    ruleIndex?: number
    before: FigureEventCondition[] | undefined
    after: FigureEventCondition[]
}) {
    const beforeCount = input.before?.length ?? 0
    const afterCount = input.after.length

    if (beforeCount === afterCount) {
        return
    }

    logFigureEventRulesDebug('conditions-normalize-diff', {
        figureId: input.figureId,
        ruleId: input.ruleId,
        ruleIndex: input.ruleIndex,
        before: input.before?.map(summarizeCondition),
        after: input.after.map(summarizeCondition),
        detail: {
            beforeCount,
            afterCount,
            droppedCount: beforeCount - afterCount,
        },
    })
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
