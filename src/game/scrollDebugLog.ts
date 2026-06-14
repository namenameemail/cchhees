import { profiler, isProfilerPanelChannel, profileDebug } from '../profiler'

const MAX_CONSOLE_LINES = 300
const CONSOLE_PREFIX = '[scroll] '

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
    const scrollLines = lines.filter(line => line.startsWith(CONSOLE_PREFIX))

    if (scrollLines.length <= MAX_CONSOLE_LINES) {
        return
    }

    profiler.setPanelText('console', scrollLines.slice(-MAX_CONSOLE_LINES).join('\n'))
}

function append(text: string, meta?: Record<string, unknown>): void {
    if (!enabled()) {
        return
    }

    const line = `${CONSOLE_PREFIX}${formatTime()}  ${text}`

    if (isProfilerPanelChannel('scroll')) {
        profiler.appendPanelText('console', line)
        trimConsoleLines()
    }

    profileDebug('scroll', text.slice(0, 200), meta)

    if (profiler.isRecording) {
        profiler.log(`scroll ${text}`, meta)
        profiler.flushLatest('scroll')
    }
}

function formatScrollMetrics(element: HTMLElement): string {
    const maxScrollLeft = element.scrollWidth - element.clientWidth
    const remainingRight = maxScrollLeft - element.scrollLeft

    return [
        `left=${element.scrollLeft.toFixed(2)}`,
        `max=${maxScrollLeft.toFixed(2)}`,
        `remR=${remainingRight.toFixed(2)}`,
        `cw=${element.clientWidth}`,
        `sw=${element.scrollWidth}`,
    ].join(' ')
}

export const scrollDebugLog = {
    reset(source: string): void {
        if (!enabled() || !isProfilerPanelChannel('scroll')) {
            return
        }

        profiler.setPanelText('console', `${CONSOLE_PREFIX}${formatTime()}  reset · ${source}\n`)
    },

    wheel(input: {
        source: string
        deltaX: number
        deltaY: number
        combinedDelta: number
        scrollLeftBefore: number
        scrollLeftAfter: number
        prevented: boolean
        handled: boolean
        skipReason?: string
        element: HTMLElement
    }): void {
        const {
            source,
            deltaX,
            deltaY,
            combinedDelta,
            scrollLeftBefore,
            scrollLeftAfter,
            prevented,
            handled,
            skipReason,
            element,
        } = input

        const action = handled
            ? prevented
                ? 'handled+prevent'
                : 'handled'
            : skipReason
                ? `skip:${skipReason}`
                : 'pass'

        append(
            `${source} wheel Δ(${deltaX.toFixed(1)},${deltaY.toFixed(1)}) Σ=${combinedDelta.toFixed(1)} ${action} before=${scrollLeftBefore.toFixed(2)} after=${scrollLeftAfter.toFixed(2)} ${formatScrollMetrics(element)}`,
            {
                source,
                deltaX,
                deltaY,
                combinedDelta,
                scrollLeftBefore,
                scrollLeftAfter,
                prevented,
                handled,
                skipReason,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                maxScrollLeft: element.scrollWidth - element.clientWidth,
            },
        )
    },

    scroll(input: {
        source: string
        element: HTMLElement
        trigger?: string
    }): void {
        const { source, element, trigger } = input

        append(
            `${source} scroll${trigger ? ` · ${trigger}` : ''} ${formatScrollMetrics(element)}`,
            {
                source,
                trigger,
                scrollLeft: element.scrollLeft,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                maxScrollLeft: element.scrollWidth - element.clientWidth,
            },
        )
    },

    scrollIntoView(input: {
        source: string
        targetId: string
        element: HTMLElement
    }): void {
        const { source, targetId, element } = input

        append(
            `${source} scrollIntoView id=${targetId} ${formatScrollMetrics(element)}`,
            { source, targetId, scrollLeft: element.scrollLeft },
        )
    },
}
