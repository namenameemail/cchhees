import { coordKey, indexToCoord } from '../types/coords'
import { CellParameters } from '../types/cells'
import { FigureCatalog, FigureId } from '../types/figures'
import { SliceHistory } from '../types/history'
import { createDefaultFigureCatalog, migrateToFigureCatalog } from '../figureView'
import { FiguresSlice, BoardSlice, composeGameState, splitGameState } from './slices'
import { GameState } from '../types/gameState'

export interface LegacyFiguresSlice {
    figuresByIndex?: Record<number, FigureId>
    figuresByCoord?: Record<string, FigureId>
    tray?: FigureId[]
}

export interface LegacyBoardSlice {
    boardParameters: BoardSlice['boardParameters']
    boardConditions?: BoardSlice['boardConditions']
    connectionsConditions?: BoardSlice['connectionsConditions']
    cellParametersByIndex?: Record<number, CellParameters>
    cellParametersByCoord?: Record<string, CellParameters>
    figureCatalog?: FigureCatalog
    figureDefinitions?: GameState['figureDefinitions']
}

function isCoordBasedFiguresSlice(slice: LegacyFiguresSlice): slice is FiguresSlice {
    return slice.figuresByCoord !== undefined && slice.figuresByIndex === undefined
}

function isCoordBasedBoardSlice(slice: LegacyBoardSlice): slice is BoardSlice {
    return slice.cellParametersByCoord !== undefined && slice.cellParametersByIndex === undefined
}

export function migrateFiguresSlice(slice: LegacyFiguresSlice, n: number): FiguresSlice {
    if (isCoordBasedFiguresSlice(slice)) {
        return {
            figuresByCoord: { ...slice.figuresByCoord },
            tray: [...(slice.tray ?? [])],
        }
    }

    const figuresByCoord: Record<string, FigureId> = {}

    for (const [indexStr, figure] of Object.entries(slice.figuresByIndex ?? {})) {
        figuresByCoord[coordKey(indexToCoord(+indexStr, n))] = figure
    }

    return {
        figuresByCoord,
        tray: [...(slice.tray ?? [])],
    }
}

export function migrateBoardSlice(slice: LegacyBoardSlice): BoardSlice {
    if (isCoordBasedBoardSlice(slice)) {
        return {
            boardParameters: { ...slice.boardParameters },
            boardConditions: [...(slice.boardConditions ?? [])],
            connectionsConditions: [...(slice.connectionsConditions ?? [])],
            cellParametersByCoord: { ...slice.cellParametersByCoord },
            figureCatalog: migrateToFigureCatalog(slice),
        }
    }

    const { n } = slice.boardParameters
    const cellParametersByCoord: Record<string, CellParameters> = {}

    for (const [indexStr, params] of Object.entries(slice.cellParametersByIndex ?? {})) {
        cellParametersByCoord[coordKey(indexToCoord(+indexStr, n))] = params
    }

    return {
        boardParameters: { ...slice.boardParameters },
        boardConditions: [...(slice.boardConditions ?? [])],
        connectionsConditions: [...(slice.connectionsConditions ?? [])],
        cellParametersByCoord,
        figureCatalog: createDefaultFigureCatalog(),
    }
}

export function migrateFiguresHistory(
    history: SliceHistory<LegacyFiguresSlice>,
    fallbackN: number,
): SliceHistory<FiguresSlice> {
    return {
        before: history.before.map(snapshot => migrateFiguresSlice(snapshot, fallbackN)),
        after: history.after.map(snapshot => migrateFiguresSlice(snapshot, fallbackN)),
    }
}

export function migrateBoardHistory(
    history: SliceHistory<LegacyBoardSlice>,
): SliceHistory<BoardSlice> {
    return {
        before: history.before.map(migrateBoardSlice),
        after: history.after.map(migrateBoardSlice),
    }
}

export function migrateGameStateFromCoords(state: GameState): GameState {
    const { figures, board } = splitGameState(state)
    return composeGameState(figures, board)
}

export function needsCoordMigration(project: {
    figuresHistory?: SliceHistory<unknown>
    boardHistory?: SliceHistory<unknown>
}): boolean {
    const legacyFigureSnapshot = project.figuresHistory?.before[0] as LegacyFiguresSlice | undefined
        ?? project.figuresHistory?.after[0] as LegacyFiguresSlice | undefined
    const legacyBoardSnapshot = project.boardHistory?.before[0] as LegacyBoardSlice | undefined
        ?? project.boardHistory?.after[0] as LegacyBoardSlice | undefined

    if (legacyFigureSnapshot?.figuresByIndex !== undefined) {
        return true
    }
    if (legacyBoardSnapshot?.cellParametersByIndex !== undefined) {
        return true
    }

    return false
}
