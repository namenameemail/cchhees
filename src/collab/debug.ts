import { createChannelDebugLog } from '@/channelDebugLog'

const log = createChannelDebugLog({
    channel: 'collab',
    consolePrefix: '[collab] ',
    profileDebugKey: 'collab',
})

export function collabLog(...args: unknown[]) {
    if (!log.enabled()) {
        return
    }

    const text = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
    log.append(text, undefined, { logToConsole: true })
}

export function collabWarn(...args: unknown[]) {
    console.warn('[collab]', ...args)
}

export function collabError(...args: unknown[]) {
    console.error('[collab]', ...args)
}

export function formatCollabError(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'object' && error !== null && 'name' in error && 'message' in error) {
        const named = error as { name: string; message: string }
        return named.message ? `${named.name}: ${named.message}` : named.name
    }

    if (typeof error === 'string') {
        return error
    }

    try {
        return JSON.stringify(error)
    } catch {
        return String(error)
    }
}
