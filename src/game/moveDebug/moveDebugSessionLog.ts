import { profiler } from '../../profiler'
import { FiguresSlice } from '../state/slices'
import { resolvePlacementStateIndex } from '../figureView'
import type { FigureBoardCompareResult } from './compareFigureBoards'
import type { MoveDebugChainStep, MoveDebugMoveInfo } from './moveDebugChainCollector'
import { moveDebugSaveLog } from './moveDebugSaveLog'

export const MOVE_DEBUG_PROFILE_FILE = 'move_debug'

export type MoveDebugLogLevel = 'info' | 'snapshot' | 'profiler' | 'compare' | 'save' | 'chain'

export interface MoveDebugLogEntry {
    id: string
    time: string
    level: MoveDebugLogLevel
    message: string
    detail?: unknown
}

let entrySeq = 0

function nextId(): string {
    entrySeq += 1
    return `${Date.now()}-${entrySeq}`
}

function formatTime(): string {
    return new Date().toISOString().slice(11, 23)
}

function formatSnapshot(figures: FiguresSlice): Array<Record<string, unknown>> {
    const items: Array<Record<string, unknown>> = []

    for (const [key, stack] of Object.entries(figures.figuresByCoord)) {
        stack.forEach((placement, stackIndex) => {
            items.push({
                coord: key,
                stackIndex,
                instanceId: placement.instanceId,
                figureId: placement.figureId,
                stateIndex: resolvePlacementStateIndex(placement),
            })
        })
    }

    return items
}

export function createMoveDebugLogEntry(
    level: MoveDebugLogLevel,
    message: string,
    detail?: unknown,
): MoveDebugLogEntry {
    return {
        id: nextId(),
        time: formatTime(),
        level,
        message,
        detail,
    }
}

export function logMoveDebugSnapshot(
    label: string,
    figures: FiguresSlice,
): MoveDebugLogEntry {
    return createMoveDebugLogEntry('snapshot', label, {
        figures: formatSnapshot(figures),
        trayCount: figures.tray.length,
    })
}

export function logMoveDebugStep(
    label: string,
    detail?: unknown,
): MoveDebugLogEntry {
    return createMoveDebugLogEntry('info', label, detail)
}

export function createMoveDebugChainLogEntries(chain: MoveDebugChainStep[]): MoveDebugLogEntry[] {
    if (chain.length === 0) {
        return [createMoveDebugLogEntry('chain', '(no moves/events/actions recorded for this move)')]
    }

    return chain.map(step => createMoveDebugLogEntry(
        'chain',
        `[${step.channel}] ${step.summary}`,
        step.detail,
    ))
}

const PROFILER_PREFIXES = ['[moves] ', '[events] ', '[actions] ', '[moveDebug-save] '] as const

export function collectProfilerGameplayLines(limit = 80): MoveDebugLogEntry[] {
    if (!import.meta.env.DEV) {
        return []
    }

    const lines = profiler.getPanelLines('console')
    const filtered = lines.filter(line => (
        PROFILER_PREFIXES.some(prefix => line.includes(prefix))
    ))

    return filtered.slice(-limit).map(line => createMoveDebugLogEntry('profiler', line.trim()))
}

export function resetMoveDebugLogSeq(): void {
    entrySeq = 0
}

export interface MoveDebugSessionFile {
    savedAt: string
    phase: string
    boardSize: { n: number; m: number }
    move?: MoveDebugMoveInfo
    chain: MoveDebugChainStep[]
    compare: FigureBoardCompareResult | null
    entries: MoveDebugLogEntry[]
}

export interface MoveDebugSaveResult {
    ok: boolean
    path?: string
    error?: string
    detail?: Record<string, unknown>
}

async function persistJsonToProfiling(
    fileName: string,
    data: unknown,
): Promise<{ path: string }> {
    const endpoint = profiler.config.clickSaveEndpoint
    const content = JSON.stringify(data, null, 2)

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content }),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `JSON save failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

export async function saveMoveDebugSessionToProject(
    session: Omit<MoveDebugSessionFile, 'savedAt'>,
): Promise<MoveDebugSaveResult> {
    const entryCount = session.entries.length
    const chainCount = session.chain.length
    const payload = {
        savedAt: new Date().toISOString(),
        ...session,
    }

    moveDebugSaveLog.invoked({
        phase: session.phase,
        entryCount,
        chainCount,
        fileName: MOVE_DEBUG_PROFILE_FILE,
    })

    if (!import.meta.env.DEV) {
        moveDebugSaveLog.skipped('not DEV build', { importMetaDev: import.meta.env.DEV })
        return { ok: false, error: 'not DEV build' }
    }

    const preflight = {
        importMetaDev: import.meta.env.DEV,
        profilerIsDev: profiler.config.isDev,
        profilerIsRecording: profiler.isRecording,
        clickSaveEndpoint: profiler.config.clickSaveEndpoint,
        entryCount,
        chainCount,
        payloadBytes: JSON.stringify(payload).length,
    }

    moveDebugSaveLog.preflight(preflight)

    if (!profiler.config.isDev) {
        const error = 'profiler.config.isDev is false'
        moveDebugSaveLog.error(error, preflight)
        return { ok: false, error, detail: preflight }
    }

    moveDebugSaveLog.request({
        endpoint: profiler.config.clickSaveEndpoint,
        fileName: MOVE_DEBUG_PROFILE_FILE,
        entryCount,
    })

    try {
        const result = await persistJsonToProfiling(MOVE_DEBUG_PROFILE_FILE, payload)

        moveDebugSaveLog.response({
            path: result.path,
            status: 'ok',
        })
        moveDebugSaveLog.success({
            path: result.path,
            entryCount,
        })

        return { ok: true, path: result.path, detail: preflight }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        moveDebugSaveLog.error(message, {
            ...preflight,
            endpoint: profiler.config.clickSaveEndpoint,
        })

        return { ok: false, error: message, detail: preflight }
    }
}

export function createMoveDebugSaveLogEntry(result: MoveDebugSaveResult): MoveDebugLogEntry {
    if (result.ok) {
        return createMoveDebugLogEntry('save', `✓ Saved profiling/${MOVE_DEBUG_PROFILE_FILE}.json`, {
            path: result.path,
            detail: result.detail,
        })
    }

    return createMoveDebugLogEntry('save', `✗ Save failed: ${result.error ?? 'unknown error'}`, {
        detail: result.detail,
    })
}
