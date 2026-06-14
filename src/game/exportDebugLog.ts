import { profiler, profileDebug, isProfilerPanelChannel } from '../profiler'

const MAX_CONSOLE_LINES = 300
const CONSOLE_PREFIX = '[export] '

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
    const exportLines = lines.filter(line => line.startsWith(CONSOLE_PREFIX))

    if (exportLines.length <= MAX_CONSOLE_LINES) {
        return
    }

    const otherLines = lines.filter(line => !line.startsWith(CONSOLE_PREFIX))
    profiler.setPanelText('console', [...otherLines, ...exportLines.slice(-MAX_CONSOLE_LINES)].join('\n'))
}

function append(text: string, meta?: Record<string, unknown>): void {
    if (!enabled()) {
        return
    }

    const line = `${CONSOLE_PREFIX}${formatTime()}  ${text}`

    if (isProfilerPanelChannel('export')) {
        profiler.appendPanelText('console', line)
        trimConsoleLines()
    }

    profileDebug('export', text.slice(0, 200), meta)

    if (profiler.isRecording) {
        profiler.log(`export ${text}`, meta)
        profiler.flushLatest('export')
    }
}

export const exportDebugLog = {
    start(meta: Record<string, unknown>): void {
        append('start', meta)
    },

    params(meta: Record<string, unknown>): void {
        const parts = [
            `borderRadius=${String(meta.resolvedBorderRadius ?? '—')}`,
            `canvasBg=${String(meta.canvasBackground ?? '—')}`,
            `shouldFill=${String(meta.shouldFill ?? '—')}`,
            `boardBg=${String(meta.boardBg ?? '—')}`,
            `frameBg=${String(meta.frameBg ?? '—')}`,
            `frameRadius=${String(meta.frameRadius ?? '—')}`,
            `clipEnabled=${String(meta.clipEnabled ?? '—')}`,
        ]
        append(`params · ${parts.join(' · ')}`, meta)
    },

    svgSummary(meta: Record<string, unknown>): void {
        append('svg-summary', meta)
    },

    done(meta?: Record<string, unknown>): void {
        append('done', meta)
    },

    error(message: string, meta?: Record<string, unknown>): void {
        append(`error · ${message}`, meta)
    },
}
