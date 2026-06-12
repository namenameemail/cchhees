import { GameState } from '../game/types/gameState'
import { SliceHistory, historyInit } from '../game/types/history'
import { FigureCatalog } from '../game/types/figures'
import {
    FiguresSlice,
    BoardSlice,
    composeGameState,
    splitGameState,
    cloneFigureCatalog,
} from '../game/state/slices'
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
import {
    migrateBoardHistoryStyleRules,
    migrateGameStateStyleRules,
} from '../game/styleRules/migrateStyleRules'
import { createDefaultFigureCatalog, migrateToFigureCatalog } from '../game/figureView'
import { initialGameState } from '../game/utils'
import { createEmptyBoardDocument } from './boardDocument'

export interface BoardDocument {
    id: string
    name: string
    gameState: GameState
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    previewDataUrl?: string
}

export interface Project {
    id: string
    name: string
    updatedAt: number
    figureCatalog: FigureCatalog
    catalogHistory: SliceHistory<FigureCatalog>
    boards: BoardDocument[]
    activeBoardId: string
    /** JPEG thumbnail of the active board for ProjectsModal. */
    previewDataUrl?: string
}

export interface ProjectPersistData {
    figureCatalog: FigureCatalog
    catalogHistory: SliceHistory<FigureCatalog>
    boards: BoardDocument[]
    activeBoardId: string
}

export interface MetaRecord {
    key: string
    value: string
}

export const CURRENT_PROJECT_ID_KEY = 'currentProjectId'
export const CURRENT_PROJECT_KIND_KEY = 'currentProjectKind'

export interface LegacySingleBoardProject {
    id: string
    name: string
    updatedAt: number
    gameState: GameState
    figuresHistory?: SliceHistory<unknown>
    boardHistory?: SliceHistory<unknown>
    previewDataUrl?: string
    figureCatalog?: FigureCatalog
    catalogHistory?: SliceHistory<FigureCatalog>
    boards?: BoardDocument[]
    activeBoardId?: string
}

function migrateBoardDocumentHistories(
    gameState: GameState,
    figuresHistory: SliceHistory<FiguresSlice>,
    boardHistory: SliceHistory<BoardSlice>,
): { figuresHistory: SliceHistory<FiguresSlice>; boardHistory: SliceHistory<BoardSlice> } {
    const migratedBoardHistory = migrateCellShapesInBoardHistory(
        migrateBoardHistoryStyleRules(boardHistory),
    )

    return { figuresHistory, boardHistory: migratedBoardHistory }
}

function migrateLegacySingleBoard(project: LegacySingleBoardProject): Project {
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

    const styledState = migrateGameStateStyleRules(project.gameState as Parameters<typeof migrateGameStateStyleRules>[0])
    const { figures, board: boardSlice } = splitGameState(styledState)
    const figureCatalog = cloneFigureCatalog(migrateToFigureCatalog({
        ...styledState,
        figureCatalog: styledState.figureCatalog,
    }))
    const catalogHistory = historyInit<FigureCatalog>()
    const { figuresHistory: migratedFiguresHistory, boardHistory: migratedBoardHistory } = migrateBoardDocumentHistories(
        styledState,
        figuresHistory,
        boardHistory,
    )
    const composedState = migrateCellShapesInGameState(composeGameState(figures, boardSlice, figureCatalog))

    const boardDocument = createEmptyBoardDocument('Доска 1', composedState, migratedFiguresHistory, migratedBoardHistory)
    boardDocument.previewDataUrl = project.previewDataUrl

    return {
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        figureCatalog,
        catalogHistory,
        boards: [boardDocument],
        activeBoardId: boardDocument.id,
        previewDataUrl: project.previewDataUrl,
    }
}

export function migrateProject(project: LegacySingleBoardProject | Project): Project {
    if (project.boards && project.activeBoardId && project.figureCatalog) {
        const boards = project.boards.map(item => {
            const styledState = migrateGameStateStyleRules(item.gameState as Parameters<typeof migrateGameStateStyleRules>[0])
            const { figures, board: boardSlice } = splitGameState(styledState)
            const catalog = cloneFigureCatalog(project.figureCatalog!)
            const { figuresHistory, boardHistory } = migrateBoardDocumentHistories(
                styledState,
                migrateFiguresHistory(
                    item.figuresHistory as SliceHistory<LegacyFiguresSlice>,
                    styledState.boardParameters.n,
                ),
                migrateBoardHistory(item.boardHistory as SliceHistory<LegacyBoardSlice>),
            )

            return {
                ...item,
                gameState: migrateCellShapesInGameState(composeGameState(figures, boardSlice, catalog)),
                figuresHistory,
                boardHistory,
            }
        })

        const activeExists = boards.some(item => item.id === project.activeBoardId)

        return {
            id: project.id,
            name: project.name,
            updatedAt: project.updatedAt,
            figureCatalog: cloneFigureCatalog(project.figureCatalog),
            catalogHistory: project.catalogHistory ?? historyInit<FigureCatalog>(),
            boards,
            activeBoardId: activeExists ? project.activeBoardId : boards[0]!.id,
            previewDataUrl: project.previewDataUrl,
        }
    }

    return migrateLegacySingleBoard(project as LegacySingleBoardProject)
}

export function normalizeLoadedProject(raw: unknown): Project {
    const migrated = migrateProject(raw as LegacySingleBoardProject)

    if (!migrated.boards.length) {
        throw new Error('Invalid project: no boards')
    }

    return migrated
}

export function getActiveBoard(project: Project): BoardDocument {
    const board = project.boards.find(item => item.id === project.activeBoardId)
    return board ?? project.boards[0]!
}

export function getActiveBoardGameState(project: Project): GameState {
    const board = getActiveBoard(project)
    const { figures, board: boardSlice } = splitGameState(board.gameState)
    return composeGameState(figures, boardSlice, project.figureCatalog)
}

export function projectToPersistData(project: Project): ProjectPersistData {
    return {
        figureCatalog: cloneFigureCatalog(project.figureCatalog),
        catalogHistory: project.catalogHistory,
        boards: project.boards.map(board => ({
            ...board,
            gameState: getBoardGameState(board, project.figureCatalog),
        })),
        activeBoardId: project.activeBoardId,
    }
}

export function getBoardGameState(board: BoardDocument, catalog: FigureCatalog): GameState {
    const { figures, board: boardSlice } = splitGameState(board.gameState)
    return composeGameState(figures, boardSlice, catalog)
}

export function createEmptyProjectData(name: string): Project {
    const catalog = createDefaultFigureCatalog()
    const board = createEmptyBoardDocument(
        'Доска 1',
        composeGameState(
            splitGameState(initialGameState).figures,
            splitGameState(initialGameState).board,
            catalog,
        ),
        historyInit(),
        historyInit(),
    )

    return {
        id: crypto.randomUUID(),
        name,
        updatedAt: Date.now(),
        figureCatalog: catalog,
        catalogHistory: historyInit<FigureCatalog>(),
        boards: [board],
        activeBoardId: board.id,
    }
}
