import { profiler, profileDebug, isProfilerPanelChannel } from '../../profiler'

const MAX_CONSOLE_LINES = 200
const CONSOLE_PREFIX = '[moveDebug-save] '

function enabled(): boolean {
    return import.meta.env.DEV
}

function formatTime(): string {
    return new Date().toLocaleTimeString(undefined, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions)
}

function trimConsoleLines(): void {
    const lines = profiler.getPanelLines('console')
    const saveLines = lines.filter(line => line.startsWith(CONSOLE_PREFIX))

    if (saveLines.length <= MAX_CONSOLE_LINES) {
        return
    }

    const otherLines = lines.filter(line => !line.startsWith(CONSOLE_PREFIX))
    profiler.setPanelText('console', [...otherLines, ...saveLines.slice(-MAX_CONSOLE_LINES)].join('\n'))
}

function append(text: string, meta?: Record<string, unknown>): void {
    if (!enabled()) {
        return
    }

    const line = `${CONSOLE_PREFIX}${formatTime()}  ${text}`

    if (isProfilerPanelChannel('moveDebug')) {
        profiler.appendPanelText('console', line)
        trimConsoleLines()
    }

    profileDebug('moveDebug-save', text.slice(0, 200), meta)

    if (profiler.isRecording) {
        profiler.log(`moveDebug-save ${text}`, meta)
        profiler.flushLatest('moveDebug-save')
    }
}

export const moveDebugSaveLog = {
    invoked(meta: Record<string, unknown>): void {
        append('invoked', meta)
    },

    preflight(meta: Record<string, unknown>): void {
        append('preflight', meta)
    },

    request(meta: Record<string, unknown>): void {
        append('request', meta)
    },

    response(meta: Record<string, unknown>): void {
        append('response', meta)
    },

    success(meta: Record<string, unknown>): void {
        append('success', meta)
    },

    skipped(reason: string, meta?: Record<string, unknown>): void {
        append(`skipped · ${reason}`, meta)
    },

    error(message: string, meta?: Record<string, unknown>): void {
        append(`error · ${message}`, meta)
    },
}
