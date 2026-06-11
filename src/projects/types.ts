import { GameState } from '../game/types/gameState'
import { SliceHistory, historyInit } from '../game/types/history'
import { FiguresSlice, BoardSlice, composeGameState, splitGameState } from '../game/state/slices'
import {
    migrateBoardHistory,
    migrateFiguresHistory,
    needsCoordMigration,
    LegacyBoardSlice,
    LegacyFiguresSlice,
} from '../game/state/migrate'
import {
    migrateCellShapesInBoardHistory,
    migrateCellShapesInGameState,
} from '../game/cellImageShape'

export interface Project {
    id: string
    name: string
    updatedAt: number
    gameState: GameState
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
}

export interface ProjectPersistData {
    state: GameState
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
}

export interface MetaRecord {
    key: string
    value: string
}

export const CURRENT_PROJECT_ID_KEY = 'currentProjectId'

export function migrateProject(project: {
    id: string
    name: string
    updatedAt: number
    gameState: GameState
    figuresHistory?: SliceHistory<unknown>
    boardHistory?: SliceHistory<unknown>
}): Project {
    if (!project.gameState?.boardParameters) {
        throw new Error(`Invalid project ${project.id}: missing boardParameters`)
    }
    let figuresHistory: SliceHistory<FiguresSlice>
    let boardHistory: SliceHistory<BoardSlice>

    if (!project.figuresHistory || !project.boardHistory) {
        figuresHistory = historyInit()
        boardHistory = historyInit()
    } else if (needsCoordMigration({ figuresHistory: project.figuresHistory, boardHistory: project.boardHistory })) {
        const n = project.gameState.boardParameters.n
        figuresHistory = migrateFiguresHistory(project.figuresHistory as SliceHistory<LegacyFiguresSlice>, n)
        boardHistory = migrateBoardHistory(project.boardHistory as SliceHistory<LegacyBoardSlice>)
    } else {
        figuresHistory = project.figuresHistory as SliceHistory<FiguresSlice>
        boardHistory = migrateBoardHistory(project.boardHistory as SliceHistory<LegacyBoardSlice>)
    }

    const { figures, board } = splitGameState(project.gameState)

    return {
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        figuresHistory,
        boardHistory: migrateCellShapesInBoardHistory(boardHistory),
        gameState: migrateCellShapesInGameState(composeGameState(figures, board)),
    }
}

export function normalizeLoadedProject(raw: unknown): Project {
    const project = raw as Parameters<typeof migrateProject>[0]
    const migrated = migrateProject(project)

    if (!migrated.gameState) {
        throw new Error('Invalid project: missing gameState')
    }

    return migrated
}
