import { profiler } from '../profiler'
import { CollabSessionStatus } from './types'
import { JoinProgress } from './joinProgress'
import { collabXferLog } from './collabXferLog'

const MAX_EVENTS = 24

interface CollabProfilerState {
    role: 'host' | 'guest' | null
    status: CollabSessionStatus
    roomId: string | null
    selfPeerId: string | null
    peerCount: number
    revision: number
    projectName: string | null
    error: string | null
    joinPhase: string | null
    snapshot: {
        assetsReceived: number
        assetsExpected: number
        styleRulesCount: number | null
        stateChunksReceived: number
        stateChunksExpected: number
    }
    opsAppliedTotal: number
    events: Array<{ at: string; text: string }>
}

const initialSnapshot = (): CollabProfilerState['snapshot'] => ({
    assetsReceived: 0,
    assetsExpected: 0,
    styleRulesCount: null,
    stateChunksReceived: 0,
    stateChunksExpected: 0,
})

let state: CollabProfilerState = {
    role: null,
    status: 'idle',
    roomId: null,
    selfPeerId: null,
    peerCount: 0,
    revision: 0,
    projectName: null,
    error: null,
    joinPhase: null,
    snapshot: initialSnapshot(),
    opsAppliedTotal: 0,
    events: [],
}

function enabled(): boolean {
    return import.meta.env.DEV
}

function shortPeerId(peerId: string | null | undefined): string {
    if (!peerId) {
        return '—'
    }

    return peerId.length > 8 ? peerId.slice(0, 8) : peerId
}

function formatEventTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

function refreshPanel(): void {
    if (!enabled()) {
        return
    }

    const lines: string[] = [
        '── collab ──',
        `room ${state.roomId ?? '—'}  role ${state.role ?? '—'}  ${state.status}`,
        `self ${shortPeerId(state.selfPeerId)}  peers ${state.peerCount + 1}  rev ${state.revision}`,
    ]

    if (state.projectName) {
        lines.push(`project ${state.projectName}`)
    }

    if (state.joinPhase) {
        lines.push(`join ${state.joinPhase}`)
    }

    if (state.error) {
        lines.push(`error ${state.error}`)
    }

    const { snapshot } = state
    const rulesLabel = snapshot.styleRulesCount == null ? '—' : String(snapshot.styleRulesCount)

    lines.push(
        `downloaded assets ${snapshot.assetsReceived}/${snapshot.assetsExpected}`
        + `  style rules ${rulesLabel}`,
    )

    if (snapshot.stateChunksExpected > 0) {
        lines.push(
            `state chunks ${snapshot.stateChunksReceived}/${snapshot.stateChunksExpected}`,
        )
    }

    if (state.opsAppliedTotal > 0) {
        lines.push(`remote ops applied ${state.opsAppliedTotal}`)
    }

    lines.push('xfer log → Console row (save Panel)')

    if (state.events.length > 0) {
        lines.push('── recent ──')

        for (const event of state.events) {
            lines.push(`${formatEventTime(event.at)}  ${event.text}`)
        }
    }

    profiler.setPanelText('profile', lines.join('\n'))
}

function patchState(partial: Partial<CollabProfilerState>): void {
    state = { ...state, ...partial }
    refreshPanel()
}

function logEvent(text: string): void {
    if (!enabled()) {
        return
    }

    const events = [
        ...state.events,
        { at: new Date().toISOString(), text },
    ].slice(-MAX_EVENTS)

    patchState({ events })
}

export const collabProfiler = {
    reset(): void {
        if (!enabled()) {
            return
        }

        state = {
            role: null,
            status: 'idle',
            roomId: null,
            selfPeerId: null,
            peerCount: 0,
            revision: 0,
            projectName: null,
            error: null,
            joinPhase: null,
            snapshot: initialSnapshot(),
            opsAppliedTotal: 0,
            events: [],
        }

        collabXferLog.reset()
        refreshPanel()
    },

    syncSession(partial: {
        role?: 'host' | 'guest' | null
        status?: CollabSessionStatus
        roomId?: string | null
        selfPeerId?: string | null
        peerCount?: number
        revision?: number
        projectName?: string | null
        error?: string | null
        joinProgress?: JoinProgress | null
    }): void {
        if (!enabled()) {
            return
        }

        const patch: Partial<CollabProfilerState> = { ...partial }

        if (partial.joinProgress !== undefined) {
            patch.joinPhase = partial.joinProgress?.active
                ? partial.joinProgress.detail
                    ? `${partial.joinProgress.label} · ${partial.joinProgress.detail}`
                    : partial.joinProgress.label
                : null
            delete (patch as { joinProgress?: JoinProgress }).joinProgress
        }

        patchState(patch)
    },

    logEvent,

    logConnection(role: 'host' | 'guest', kind: string, peerId?: string, detail?: string): void {
        const peer = peerId ? ` ${shortPeerId(peerId)}` : ''
        const suffix = detail ? ` (${detail})` : ''
        logEvent(`${role}: ${kind}${peer}${suffix}`)
    },

    beginSnapshot(projectName: string, assetsExpected: number, stateChunkCount: number): void {
        if (!enabled()) {
            return
        }

        patchState({
            projectName,
            snapshot: {
                assetsReceived: 0,
                assetsExpected,
                styleRulesCount: null,
                stateChunksReceived: 0,
                stateChunksExpected: stateChunkCount,
            },
        })

        logEvent(`snapshot start «${projectName}» assets ${assetsExpected} chunks ${stateChunkCount}`)
    },

    updateStateChunks(received: number, total: number): void {
        if (!enabled()) {
            return
        }

        patchState({
            snapshot: {
                ...state.snapshot,
                stateChunksReceived: received,
                stateChunksExpected: total,
            },
        })
    },

    updateSnapshotState(styleRulesCount: number): void {
        if (!enabled()) {
            return
        }

        patchState({
            snapshot: {
                ...state.snapshot,
                styleRulesCount,
            },
        })
    },

    assetReceived(assetName: string, received: number, expected: number): void {
        if (!enabled()) {
            return
        }

        patchState({
            snapshot: {
                ...state.snapshot,
                assetsReceived: received,
                assetsExpected: expected,
            },
        })

        logEvent(`asset ${received}/${expected} ${assetName}`)
    },

    snapshotComplete(assetsCount: number, styleRulesCount: number, projectName: string): void {
        if (!enabled()) {
            return
        }

        patchState({
            projectName,
            snapshot: {
                ...state.snapshot,
                assetsReceived: assetsCount,
                styleRulesCount,
            },
        })

        logEvent(`snapshot complete assets ${assetsCount} rules ${styleRulesCount}`)
    },

    opsApplied(count: number, revision: number): void {
        if (!enabled()) {
            return
        }

        patchState({
            revision,
            opsAppliedTotal: state.opsAppliedTotal + count,
        })

        logEvent(`ops ×${count} rev ${revision}`)
    },

    hostSnapshotPhase(label: string, detail?: string): void {
        if (!enabled()) {
            return
        }

        logEvent(`host snapshot: ${label}${detail ? ` · ${detail}` : ''}`)
    },
}
