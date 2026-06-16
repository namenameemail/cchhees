import { createChannelDebugLog } from '../channelDebugLog'

const log = createChannelDebugLog({
    channel: 'scroll',
    consolePrefix: '[scroll] ',
    maxConsoleLines: 300,
    keepOtherLines: false,
    profileDebugMaxChars: 200,
})

function append(text: string, meta?: Record<string, unknown>): void {
    log.append(text, meta)
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
        log.resetPanel(source)
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
