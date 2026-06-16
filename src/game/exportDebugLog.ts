import { createChannelDebugLog } from '../channelDebugLog'

const log = createChannelDebugLog({
    channel: 'export',
    consolePrefix: '[export] ',
    maxConsoleLines: 300,
    profileDebugMaxChars: 200,
})

function append(text: string, meta?: Record<string, unknown>): void {
    log.append(text, meta)
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
