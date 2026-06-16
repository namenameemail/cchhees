import { coordKey, indexToCoord } from '../types/coords'
import { CellParameters } from '../types/cells'
import { BoardConditionItem } from '../types/conditions'
import { BoardConnectionsConditionItem } from '../types/connections'
import { FigureCatalog, FigureId, FigurePlacement, FigurePlacementInput } from '../types/figures'
import { SliceHistory, normalizeSliceHistory } from '../types/history'
import { createDefaultFigureCatalog, migrateToFigureCatalog } from '../figureView'
import { migrateBoardSliceStyleRules } from '../styleRules/migrateStyleRules'
import { FiguresSlice, BoardSlice, composeGameState, splitGameState, normalizeFiguresSlice } from './slices'
import { GameState } from '../types/gameState'

export interface LegacyFiguresSlice {
    figuresByIndex?: Record<number, FigureId>
    figuresByCoord?: Record<string, FigureId | FigurePlacementInput | FigurePlacement[]>
    tray?: Array<FigureId | FigurePlacementInput>
}

export interface LegacyBoardSlice {
    boardParameters: BoardSlice['boardParameters']
    styleRules?: BoardSlice['styleRules']
    boardConditions?: BoardConditionItem[]
    connectionsConditions?: BoardConnectionsConditionItem[]
    cellParametersByIndex?: Record<number, CellParameters>
    cellParametersByCoord?: Record<string, CellParameters>
    figureCatalog?: FigureCatalog
    figureDefinitions?: GameState['figureDefinitions']
}

function isCoordBasedFiguresSlice(slice: LegacyFiguresSlice): slice is FiguresSlice {
    return slice.figuresByCoord !== undefined && slice.figuresByIndex === undefined
}

function isCoordBasedBoardSlice(slice: LegacyBoardSlice): boolean {
    return slice.cellParametersByCoord !== undefined && slice.cellParametersByIndex === undefined
}

function stripCatalogFromLegacyBoardSlice(slice: LegacyBoardSlice): BoardSlice {
    const migrated = migrateBoardSlice(slice)
    const { figureCatalog: _removed, ...board } = migrated as BoardSlice & { figureCatalog?: FigureCatalog }
    return board
}

export function migrateFiguresSlice(slice: LegacyFiguresSlice, n: number): FiguresSlice {
    if (isCoordBasedFiguresSlice(slice)) {
        return normalizeFiguresSlice({
            figuresByCoord: { ...slice.figuresByCoord },
            tray: [...(slice.tray ?? [])],
        } as FiguresSlice)
    }

    const figuresByCoord: Record<string, FigurePlacementInput | FigurePlacementInput[]> = {}

    for (const [indexStr, figure] of Object.entries(slice.figuresByIndex ?? {})) {
        figuresByCoord[coordKey(indexToCoord(+indexStr, n))] = figure
    }

    return normalizeFiguresSlice({
        figuresByCoord,
        tray: [...(slice.tray ?? [])],
    } as FiguresSlice)
}

export function migrateBoardSlice(slice: LegacyBoardSlice): BoardSlice {
    if (isCoordBasedBoardSlice(slice)) {
        return migrateBoardSliceStyleRules({
            boardParameters: { ...slice.boardParameters },
            styleRules: slice.styleRules,
            boardConditions: slice.boardConditions,
            connectionsConditions: slice.connectionsConditions,
            cellParametersByCoord: { ...slice.cellParametersByCoord! },
        })
    }

    const { n } = slice.boardParameters
    const cellParametersByCoord: Record<string, CellParameters> = {}

    for (const [indexStr, params] of Object.entries(slice.cellParametersByIndex ?? {})) {
        cellParametersByCoord[coordKey(indexToCoord(+indexStr, n))] = params
    }

    return migrateBoardSliceStyleRules({
        boardParameters: { ...slice.boardParameters },
        styleRules: slice.styleRules,
        boardConditions: slice.boardConditions,
        connectionsConditions: slice.connectionsConditions,
        cellParametersByCoord,
    })
}

export function extractCatalogFromLegacyBoardSlice(slice: LegacyBoardSlice): FigureCatalog {
    return migrateToFigureCatalog(slice)
}

export function migrateFiguresHistory(
    history: SliceHistory<LegacyFiguresSlice>,
    fallbackN: number,
): SliceHistory<FiguresSlice> {
    const normalized = normalizeSliceHistory(history)

    return {
        before: normalized.before.map(snapshot => migrateFiguresSlice(snapshot, fallbackN)),
        after: normalized.after.map(snapshot => migrateFiguresSlice(snapshot, fallbackN)),
    }
}

export function migrateBoardHistory(
    history: SliceHistory<LegacyBoardSlice>,
): SliceHistory<BoardSlice> {
    const normalized = normalizeSliceHistory(history)

    return {
        before: normalized.before.map(migrateBoardSlice),
        after: normalized.after.map(snapshot => migrateBoardSlice(snapshot)),
    }
}

export function migrateGameStateFromCoords(state: GameState, catalog?: FigureCatalog): GameState {
    const { figures, board } = splitGameState(state)
    const resolvedCatalog = catalog ?? state.figureCatalog ?? createDefaultFigureCatalog()
    return composeGameState(figures, board, resolvedCatalog)
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
