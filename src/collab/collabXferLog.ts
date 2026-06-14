import { profiler, profileDebug, isProfilerPanelChannel } from '../profiler'
import { CollabOp } from './ops'
import { CollabSyncMessage } from './types'
import { measureJsonBytes } from './dataChannelSend'

const MAX_CONSOLE_LINES = 180
const CONSOLE_PREFIX = '[collab] '

let sessionBanner = ''

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

function shortPeer(peerId?: string | null): string {
    if (!peerId) {
        return '?'
    }

    return peerId.length > 8 ? peerId.slice(0, 8) : peerId
}

export function summarizeOps(ops: CollabOp[]): string {
    const counts = new Map<string, number>()

    for (const op of ops) {
        counts.set(op.kind, (counts.get(op.kind) ?? 0) + 1)
    }

    return [...counts.entries()]
        .map(([kind, count]) => (count > 1 ? `${kind}×${count}` : kind))
        .join(', ') || '—'
}

export function describeCollabMessage(message: CollabSyncMessage): string {
    switch (message.type) {
        case 'hello':
            return `hello rev ${message.revision} «${message.projectName ?? '—'}»`
        case 'snapshot':
            return `snapshot «${message.projectName ?? '—'}» rev ${message.revision} assets ${message.assets?.length ?? message.pendingAssetCount ?? 0}`
        case 'snapshot-meta':
            return `snapshot-meta «${message.projectName ?? '—'}» state×${message.stateChunkCount ?? 0} assets ${message.pendingAssetCount ?? 0}`
        case 'state-chunk':
            return `state-chunk ${(message.index ?? 0) + 1}/${message.total ?? '?'}`
        case 'asset-chunk':
            return `asset-chunk ${(message.assetIndex ?? 0) + 1}/${message.assetTotal ?? '?'} «${message.asset?.name ?? message.assetName ?? '?'}» id ${message.asset?.id ?? message.assetId ?? '?'}`
        case 'asset-meta':
            return `asset-meta ${(message.assetIndex ?? 0) + 1}/${message.assetTotal ?? '?'} «${message.assetName}» id ${message.assetId} chunks ${message.dataChunkCount}`
        case 'asset-data-chunk':
            return `asset-data-chunk id ${message.assetId} ${(message.index ?? 0) + 1}/${message.total ?? message.dataChunkCount ?? '?'}`
        case 'live-asset-chunk':
            return `live-asset «${message.asset?.name ?? '?'}» id ${message.asset?.id ?? '?'}`
        case 'live-asset-meta':
            return `live-asset-meta «${message.assetName}» id ${message.assetId} chunks ${message.dataChunkCount}`
        case 'live-asset-data-chunk':
            return `live-asset-data ${(message.index ?? 0) + 1}/${message.total ?? '?'} id ${message.assetId}`
        case 'live-asset-remove':
            return `live-asset-remove id ${message.assetId ?? '?'}`
        case 'ops':
            return `ops ×${message.ops?.length ?? 0} [${summarizeOps(message.ops ?? [])}] rev ${message.revision}`
        case 'ops-meta':
            return `ops-meta chunks ${message.stateChunkCount} rev ${message.revision}`
        case 'ops-chunk':
            return `ops-chunk ${(message.index ?? 0) + 1}/${message.total ?? '?'} rev ${message.revision}`
        case 'patch':
            return `patch rev ${message.revision}`
        case 'patch-meta':
            return `patch-meta chunks ${message.stateChunkCount}`
        case 'patch-chunk':
            return `patch-chunk ${(message.index ?? 0) + 1}/${message.total ?? '?'}`
        default:
            return message.type
    }
}

function trimConsoleLines(): void {
    const lines = profiler.getPanelLines('console')
    const collabLines = lines.filter(line => line.startsWith(CONSOLE_PREFIX))

    if (collabLines.length <= MAX_CONSOLE_LINES) {
        return
    }

    const otherLines = lines.filter(line => !line.startsWith(CONSOLE_PREFIX))
    const trimmed = collabLines.slice(-MAX_CONSOLE_LINES)
    profiler.setPanelText('console', [...otherLines, ...trimmed].join('\n'))
}

function appendLine(text: string, meta?: Record<string, unknown>): void {
    if (!enabled()) {
        return
    }

    const line = `${CONSOLE_PREFIX}${formatTime()}  ${text}`

    if (isProfilerPanelChannel('collab')) {
        profiler.appendPanelText('console', line)
        trimConsoleLines()
    }

    profileDebug('collab.xfer', text.slice(0, 120), meta)

    if (profiler.isRecording) {
        profiler.log(`collab.xfer ${text}`, meta)
        profiler.flushLatest('collab')
    }
}

export const collabXferLog = {
    reset(role?: string | null): void {
        if (!enabled()) {
            return
        }

        sessionBanner = role ? `session ${role}` : 'session'
        appendLine(`── collab xfer ${sessionBanner} ──`)
    },

    signaling(direction: 'tx' | 'rx', type: string, detail?: string, peerId?: string): void {
        const arrow = direction === 'tx' ? '→sig' : '←sig'
        const peer = peerId ? ` ${shortPeer(peerId)}` : ''
        appendLine(`${arrow} ${type}${peer}${detail ? ` · ${detail}` : ''}`, { direction, type, detail })
    },

    tx(message: CollabSyncMessage, bytes?: number, targetPeer?: string): void {
        const size = bytes ?? measureJsonBytes(message)
        const target = targetPeer ? ` →${shortPeer(targetPeer)}` : ''
        appendLine(`TX${target} ${describeCollabMessage(message)} · ${size}B from ${shortPeer(message.peerId)}`, {
            direction: 'tx',
            type: message.type,
            bytes: size,
            peerId: message.peerId,
        })
    },

    rx(message: CollabSyncMessage, fromPeer?: string, bytes?: number): void {
        const size = bytes ?? measureJsonBytes(message)
        appendLine(`RX ←${shortPeer(fromPeer ?? message.peerId)} ${describeCollabMessage(message)} · ${size}B`, {
            direction: 'rx',
            type: message.type,
            bytes: size,
            from: fromPeer ?? message.peerId,
        })
    },

    relay(message: CollabSyncMessage, fromPeer: string, toPeer: string): void {
        appendLine(`RELAY ${shortPeer(fromPeer)}→${shortPeer(toPeer)} ${describeCollabMessage(message)}`, {
            direction: 'relay',
            type: message.type,
            from: fromPeer,
            to: toPeer,
        })
    },

    opsLocalEnqueue(ops: CollabOp[], pendingTotal: number): void {
        appendLine(`LOCAL ops +${ops.length} [${summarizeOps(ops)}] pending ${pendingTotal}`, {
            kind: 'local-ops',
            count: ops.length,
            pendingTotal,
            ops: summarizeOps(ops),
        })
    },

    opsBroadcast(revision: number, ops: CollabOp[], role: 'host' | 'guest'): void {
        appendLine(`BROADCAST ops ×${ops.length} [${summarizeOps(ops)}] rev ${revision} as ${role}`, {
            kind: 'broadcast-ops',
            revision,
            count: ops.length,
            role,
        })
    },

    opsApplied(ops: CollabOp[], revision: number, source: string): void {
        appendLine(`APPLY ops ×${ops.length} [${summarizeOps(ops)}] rev ${revision} ← ${source}`, {
            kind: 'apply-ops',
            revision,
            count: ops.length,
            source,
        })
    },

    opsSkipped(reason: string, revision: number): void {
        appendLine(`SKIP ops rev ${revision}: ${reason}`, { kind: 'skip-ops', revision, reason })
    },

    assetBroadcast(assetId: number, name: string, role: 'host' | 'guest'): void {
        appendLine(`BROADCAST live-asset «${name}» id ${assetId} as ${role}`, {
            kind: 'broadcast-asset',
            assetId,
            name,
            role,
        })
    },

    assetApplied(assetId: number, name: string, source: string): void {
        appendLine(`APPLY live-asset «${name}» id ${assetId} ← ${source}`, {
            kind: 'apply-asset',
            assetId,
            name,
            source,
        })
    },

    assetRemoveBroadcast(assetId: number, role: 'host' | 'guest'): void {
        appendLine(`BROADCAST live-asset-remove id ${assetId} as ${role}`, {
            kind: 'broadcast-asset-remove',
            assetId,
            role,
        })
    },

    assetRemoveApplied(assetId: number, source: string): void {
        appendLine(`APPLY live-asset-remove id ${assetId} ← ${source}`, {
            kind: 'apply-asset-remove',
            assetId,
            source,
        })
    },

    assetSkipped(reason: string, assetId?: number, name?: string): void {
        appendLine(`SKIP asset ${assetId ?? '?'} «${name ?? '?'}»: ${reason}`, {
            kind: 'skip-asset',
            assetId,
            name,
            reason,
        })
    },

    snapshotPhase(phase: string, detail?: string): void {
        appendLine(`SNAPSHOT ${phase}${detail ? ` · ${detail}` : ''}`, { kind: 'snapshot', phase, detail })
    },

    warn(text: string, meta?: Record<string, unknown>): void {
        appendLine(`WARN ${text}`, meta)
    },

    error(text: string, meta?: Record<string, unknown>): void {
        appendLine(`ERR ${text}`, meta)
    },
}
