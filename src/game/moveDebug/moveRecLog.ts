import { profiler } from '../../profiler'
import { BoardParameters } from '../types/boardParameters'
import { CellCoord } from '../types/coords'
import { FigureEventRule } from '../types/events'
import { FigureCatalog, FigureTeams } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import type { FigureMoveDebugInfo } from './figureMoveDebugInfo'
import type { MoveDebugChainStep } from './moveDebugChainCollector'
import { formatBoardSnapshot, persistJsonToProfiling } from './moveDebugSessionLog'

export const MOVE_REC_PROFILE_FILE = 'move_rec'

export type MoveRecSnapshotItem = Record<string, unknown>

export interface MoveRecSetup {
    recordedAt: string
    boardParameters: BoardParameters
    figureTeams: FigureTeams
    catalog: FigureCatalog
    eventRules: FigureEventRule[]
    board: {
        figures: MoveRecSnapshotItem[]
        trayCount: number
    }
}

export interface MoveRecMoveEntry {
    index: number
    recordedAt: string
    from: CellCoord
    to: CellCoord
    actorFigure?: FigureMoveDebugInfo
    targetFigure?: FigureMoveDebugInfo
    before: MoveRecSnapshotItem[]
    after: MoveRecSnapshotItem[]
    chain: MoveDebugChainStep[]
}

export interface MoveRecFile {
    version: 1
    savedAt: string
    setup: MoveRecSetup | null
    moves: MoveRecMoveEntry[]
}

export interface MoveRecSetupInput {
    boardParameters: BoardParameters
    figureTeams: FigureTeams
    catalog: FigureCatalog
    eventRules: FigureEventRule[]
    figuresSlice: FiguresSlice
}

export interface MoveRecMoveInput {
    from: CellCoord
    to: CellCoord
    actorFigure?: FigureMoveDebugInfo
    targetFigure?: FigureMoveDebugInfo
    before: FiguresSlice
    after: FiguresSlice
    chain: MoveDebugChainStep[]
}

export interface MoveRecSaveResult {
    ok: boolean
    path?: string
    error?: string
}

let recording = false
let session: MoveRecFile = createEmptySession()

function createEmptySession(): MoveRecFile {
    return {
        version: 1,
        savedAt: '',
        setup: null,
        moves: [],
    }
}

function buildSetup(input: MoveRecSetupInput): MoveRecSetup {
    return {
        recordedAt: new Date().toISOString(),
        boardParameters: input.boardParameters,
        figureTeams: input.figureTeams,
        catalog: input.catalog,
        eventRules: input.eventRules,
        board: {
            figures: formatBoardSnapshot(input.figuresSlice),
            trayCount: input.figuresSlice.tray.length,
        },
    }
}

export function isMoveRecActive(): boolean {
    return recording
}

export function getMoveRecMoveCount(): number {
    return session.moves.length
}

export function hasMoveRecData(): boolean {
    return session.setup !== null || session.moves.length > 0
}

export function getMoveRecSession(): MoveRecFile {
    return session
}

export function resetMoveRecSession(): void {
    recording = false
    session = createEmptySession()
}

export function startMoveRecRecording(input: MoveRecSetupInput): void {
    session = {
        version: 1,
        savedAt: '',
        setup: buildSetup(input),
        moves: [],
    }
    recording = true
}

export function stopMoveRecRecording(): void {
    recording = false
}

export function appendMoveRecMove(input: MoveRecMoveInput): MoveRecMoveEntry | null {
    if (!recording) {
        return null
    }

    const entry: MoveRecMoveEntry = {
        index: session.moves.length,
        recordedAt: new Date().toISOString(),
        from: input.from,
        to: input.to,
        actorFigure: input.actorFigure,
        targetFigure: input.targetFigure,
        before: formatBoardSnapshot(input.before),
        after: formatBoardSnapshot(input.after),
        chain: input.chain,
    }

    session.moves.push(entry)

    return entry
}

export async function saveMoveRecToProject(): Promise<MoveRecSaveResult> {
    if (!import.meta.env.DEV) {
        return { ok: false, error: 'not DEV build' }
    }

    if (!hasMoveRecData()) {
        return { ok: false, error: 'no recorded data' }
    }

    if (!profiler.config.isDev) {
        return { ok: false, error: 'profiler.config.isDev is false' }
    }

    const payload: MoveRecFile = {
        ...session,
        savedAt: new Date().toISOString(),
    }

    try {
        const result = await persistJsonToProfiling(MOVE_REC_PROFILE_FILE, payload)
        session.savedAt = payload.savedAt

        return { ok: true, path: result.path }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { ok: false, error: message }
    }
}
