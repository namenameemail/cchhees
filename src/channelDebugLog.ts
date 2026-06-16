import {
    isProfilerPanelChannel,
    profileDebug,
    profiler,
    type ProfilerPanelChannel,
} from './profiler'
import type { CellCoord } from '@/game/types/coords'

export function isDebugEnabled(): boolean {
    return import.meta.env?.DEV ?? false
}

export function formatDebugTime(): string {
    return new Date().toLocaleTimeString(undefined, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions)
}

export function formatDebugCoord(
    coord: CellCoord | undefined,
    style: 'parens' | 'plain' = 'parens',
): string {
    if (!coord) {
        return '—'
    }

    return style === 'plain' ? `${coord.i},${coord.j}` : `(${coord.i},${coord.j})`
}

export type ChannelDebugLogConfig = {
    channel: ProfilerPanelChannel
    consolePrefix: string
    maxConsoleLines?: number
    /** When true, non-matching console lines are preserved when trimming. Default true. */
    keepOtherLines?: boolean
    /** Key passed to profileDebug. Defaults to channel. */
    profileDebugKey?: string
    /** Max chars for profileDebug message. Default 120. */
    profileDebugMaxChars?: number
}

export type ChannelDebugAppendOptions = {
    /** Skip timestamp in panel line (caller builds full line). */
    rawLine?: boolean
    /** Also log to console.log. */
    logToConsole?: boolean
}

export function createChannelDebugLog(config: ChannelDebugLogConfig) {
    const {
        channel,
        consolePrefix,
        maxConsoleLines = 200,
        keepOtherLines = true,
        profileDebugKey = channel,
        profileDebugMaxChars = 120,
    } = config

    function trimConsoleLines(): void {
        const lines = profiler.getPanelLines('console')
        const channelLines = lines.filter(line => line.startsWith(consolePrefix))

        if (channelLines.length <= maxConsoleLines) {
            return
        }

        const trimmed = channelLines.slice(-maxConsoleLines)

        if (keepOtherLines) {
            const otherLines = lines.filter(line => !line.startsWith(consolePrefix))
            profiler.setPanelText('console', [...otherLines, ...trimmed].join('\n'))
        } else {
            profiler.setPanelText('console', trimmed.join('\n'))
        }
    }

    function append(text: string, meta?: Record<string, unknown>, options?: ChannelDebugAppendOptions): void {
        if (!isDebugEnabled()) {
            return
        }

        const line = options?.rawLine
            ? text
            : `${consolePrefix}${formatDebugTime()}  ${text}`

        if (options?.logToConsole) {
            console.log(line)
        }

        if (isProfilerPanelChannel(channel)) {
            profiler.appendPanelText('console', line)
            trimConsoleLines()
        }

        profileDebug(profileDebugKey, text.slice(0, profileDebugMaxChars), meta)

        if (profiler.isRecording) {
            profiler.log(`${profileDebugKey} ${text}`, meta)
            profiler.flushLatest(channel)
        }
    }

    function resetPanel(source: string): void {
        if (!isDebugEnabled() || !isProfilerPanelChannel(channel)) {
            return
        }

        profiler.setPanelText('console', `${consolePrefix}${formatDebugTime()}  reset · ${source}\n`)
    }

    return {
        enabled: isDebugEnabled,
        formatTime: formatDebugTime,
        formatCoord: formatDebugCoord,
        trimConsoleLines,
        append,
        resetPanel,
        consolePrefix,
        channel,
    }
}
