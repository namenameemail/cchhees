type FigureFilterDebugEvent = {
    at: number
    action: string
    field?: string
    figureId?: string
    before?: unknown
    after?: unknown
    detail?: Record<string, unknown>
}

const MAX_EVENTS = 80
const events: FigureFilterDebugEvent[] = []

if (typeof window !== 'undefined') {
    (window as Window & { __FIGURE_FILTER_DEBUG__?: FigureFilterDebugEvent[] })
        .__FIGURE_FILTER_DEBUG__ = []
}

function pushEvent(event: Omit<FigureFilterDebugEvent, 'at'>) {
    const entry: FigureFilterDebugEvent = { at: Date.now(), ...event }

    events.push(entry)

    if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS)
    }

    console.log('[FigureFilterArray]', event.action, {
        field: event.field,
        figureId: event.figureId,
        before: event.before,
        after: event.after,
        detail: event.detail,
    })

    if (typeof window !== 'undefined') {
        (window as Window & { __FIGURE_FILTER_DEBUG__?: FigureFilterDebugEvent[] })
            .__FIGURE_FILTER_DEBUG__ = [...events]
    }
}

export function logFigureFilterDebug(
    action: string,
    payload: Omit<FigureFilterDebugEvent, 'at' | 'action'> = {},
) {
    pushEvent({ action, ...payload })
}

export function getFigureFilterDebugEvents(): FigureFilterDebugEvent[] {
    return [...events]
}
