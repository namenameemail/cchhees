import { createChannelDebugLog, formatDebugCoord, isDebugEnabled } from '../channelDebugLog'
import { isProfilerPanelChannel, profiler, profileDebug } from '../profiler'
import { CellCoord } from './types/coords'
import { GameAction } from './types/events'

const MAX_EVENTS = 120
const MAX_CONSOLE_LINES = 160
const CONSOLE_PREFIX = '[actions] '

const channelLog = createChannelDebugLog({
    channel: 'actions',
    consolePrefix: CONSOLE_PREFIX,
    maxConsoleLines: MAX_CONSOLE_LINES,
    profileDebugMaxChars: 160,
})

export type FigureActionsDebugEvent = {
    at: number
    action: string
    context?: string
    subject?: string
    gameAction?: GameAction
    result?: 'applied' | 'skipped' | 'queued' | 'no-op'
    reason?: string
    detail?: Record<string, unknown>
}

const events: FigureActionsDebugEvent[] = []

if (typeof window !== 'undefined') {
    (window as Window & { __FIGURE_ACTIONS_DEBUG__?: FigureActionsDebugEvent[] })
        .__FIGURE_ACTIONS_DEBUG__ = []
}

function formatGameAction(action: GameAction | undefined): string {
    if (!action) {
        return '—'
    }

    return `${action.type} ${JSON.stringify(action.params ?? {})}`
}

function pushEvent(event: Omit<FigureActionsDebugEvent, 'at'>) {
    if (!isDebugEnabled()) {
        return
    }

    const entry: FigureActionsDebugEvent = { at: Date.now(), ...event }

    events.push(entry)

    if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS)
    }

    const detailText = event.detail != null
        ? ` ${JSON.stringify(event.detail)}`
        : ''

    const line = `${CONSOLE_PREFIX}${event.action}`
        + (event.context ? ` ctx=${event.context}` : '')
        + (event.subject ? ` subject=${event.subject}` : '')
        + (event.result ? ` result=${event.result}` : '')
        + (event.reason ? ` reason=${event.reason}` : '')
        + (event.gameAction ? ` action=${formatGameAction(event.gameAction)}` : '')
        + detailText

    console.log(line)

    if (typeof window !== 'undefined') {
        (window as Window & { __FIGURE_ACTIONS_DEBUG__?: FigureActionsDebugEvent[] })
            .__FIGURE_ACTIONS_DEBUG__ = [...events]
    }

    if (isProfilerPanelChannel('actions')) {
        profiler.appendPanelText('console', line)
        channelLog.trimConsoleLines()
    }

    profileDebug('actions', event.action.slice(0, 160), {
        context: event.context,
        subject: event.subject,
        result: event.result,
        reason: event.reason,
        gameAction: event.gameAction,
        ...event.detail,
    })

    if (profiler.isRecording) {
        profiler.log(`actions ${event.action}`, {
            context: event.context,
            subject: event.subject,
            result: event.result,
            reason: event.reason,
            gameAction: event.gameAction,
            detail: event.detail,
        })
        profiler.flushLatest('actions')
    }
}

export function logFigureActionDebug(
    action: string,
    payload: Omit<FigureActionsDebugEvent, 'at' | 'action'> = {},
) {
    pushEvent({ action, ...payload })
}

export function getFigureActionsDebugEvents(): FigureActionsDebugEvent[] {
    return [...events]
}

export function logFigureActionApply(input: {
    context: string
    gameAction: GameAction
    subject?: string
    result: 'applied' | 'skipped' | 'queued' | 'no-op'
    reason?: string
    detail?: Record<string, unknown>
}) {
    logFigureActionDebug('apply', {
        context: input.context,
        subject: input.subject,
        gameAction: input.gameAction,
        result: input.result,
        reason: input.reason,
        detail: input.detail,
    })
}

export function logFigureDisplaceDebug(input: {
    context: string
    subject?: string
    from: CellCoord
    to?: CellCoord
    params: { dx: number; dy: number }
    result: 'moved' | 'blocked' | 'off-board' | 'wrapped' | 'skipped'
    reason?: string
    detail?: Record<string, unknown>
}) {
    const toPart = input.to ? formatDebugCoord(input.to) : 'off-board'

    logFigureActionDebug('displace', {
        context: input.context,
        subject: input.subject,
        result: input.result === 'skipped' ? 'skipped' : 'applied',
        reason: input.reason,
        detail: {
            from: input.from,
            to: input.to,
            toLabel: toPart,
            dx: input.params.dx,
            dy: input.params.dy,
            result: input.result,
            ...input.detail,
        },
    })
}
