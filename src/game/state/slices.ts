import { Cell, CellParameters } from '../types/cells'
import { FigureCatalog, FigureId, FigurePlacement, FigurePlacementInput } from '../types/figures'
import { cloneFigureState, cloneFigurePlacement, normalizeFigurePlacement, normalizeFigureCatalog } from '../figureView'
import { GameState } from '../types/gameState'
import { BoardParameters } from '../types/boardParameters'
import { BoardStyleRule } from '../types/styleRules'
import { FigureEventRule } from '../types/events'
import { coordKey, coordToIndex, indexToCoord, isCoordInGrid, iterGridCoords } from '../types/coords'
import { initialGameState } from '../utils'
import { cloneFiguresByCoord, getCellStack, getTopOfStack, isStackArray, normalizeStackEntry } from '../figureStack'
import { migrateBoardAndCatalogEventRules } from './boardEventRules'

export interface FiguresSlice {
    figuresByCoord: Record<string, FigurePlacement[]>
    tray: FigurePlacement[]
}

export interface BoardSlice {
    boardParameters: BoardParameters
    styleRules: BoardStyleRule[]
    cellParametersByCoord: Record<string, CellParameters>
    eventRules?: FigureEventRule[]
}

function normalizeCellFigures(cell: Cell | undefined): FigurePlacement[] {
    return getCellStack(cell).map(item => normalizeFigurePlacement(item))
}

export function normalizeFiguresSlice(figures: FiguresSlice | {
    figuresByCoord: Record<string, FigurePlacement | FigurePlacement[]>
    tray: Array<FigureId | FigurePlacementInput>
}): FiguresSlice {
    const figuresByCoord: Record<string, FigurePlacement[]> = {}

    for (const [key, raw] of Object.entries(figures.figuresByCoord)) {
        const stack = isStackArray(raw)
            ? raw.map(item => normalizeFigurePlacement(item as FigurePlacementInput))
            : normalizeStackEntry(normalizeFigurePlacement(raw as FigureId | FigurePlacementInput))

        if (stack.length > 0) {
            figuresByCoord[key] = stack
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.map(item => normalizeFigurePlacement(item as FigureId | FigurePlacementInput)),
    }
}

export function splitGameState(state: GameState): { figures: FiguresSlice; board: BoardSlice } {
    const { n } = state.boardParameters
    const figuresByCoord: Record<string, FigurePlacement[]> = {}
    const cellParametersByCoord: Record<string, CellParameters> = {}

    for (const [index, cell] of (state.cells ?? []).entries()) {
        const key = coordKey(indexToCoord(index, n))
        const stack = normalizeCellFigures(cell)

        if (stack.length > 0) {
            figuresByCoord[key] = stack
        }

        if (cell.parameters && Object.keys(cell.parameters).length > 0) {
            cellParametersByCoord[key] = cell.parameters
        }
    }

    return {
        figures: normalizeFiguresSlice({
            figuresByCoord,
            tray: [...(state.tray ?? [])],
        }),
        board: {
            boardParameters: { ...state.boardParameters },
            styleRules: [...(state.styleRules ?? [])],
            cellParametersByCoord,
            eventRules: state.eventRules ? [...state.eventRules] : undefined,
        },
    }
}

export function composeGameState(
    figures: FiguresSlice,
    board: BoardSlice,
    catalog: FigureCatalog,
): GameState {
    const normalizedFigures = normalizeFiguresSlice(figures)
    const { n, m } = board.boardParameters
    const cells: Cell[] = iterGridCoords(n, m).map(({ i, j }) => {
        const key = coordKey({ i, j })
        const stack = normalizedFigures.figuresByCoord[key] ?? []
        const top = getTopOfStack(normalizedFigures, { i, j })

        return {
            parameters: board.cellParametersByCoord[key],
            figures: stack.map(cloneFigurePlacement),
            figure: top ? cloneFigurePlacement(top) : undefined,
        }
    })

    const { board: migratedBoard, catalog: migratedCatalog } = migrateBoardAndCatalogEventRules(
        board,
        normalizeFigureCatalog(catalog),
    )

    return {
        boardParameters: migratedBoard.boardParameters,
        styleRules: migratedBoard.styleRules,
        eventRules: migratedBoard.eventRules,
        figureCatalog: migratedCatalog.map(entry => ({
            id: entry.id,
            ...(entry.team !== undefined ? { team: entry.team } : {}),
            ...(entry.moveDirection !== undefined && entry.moveDirection !== 'up'
                ? { moveDirection: entry.moveDirection }
                : {}),
            states: entry.states.map(state => cloneFigureState(state)),
        })),
        cells,
        tray: normalizedFigures.tray.map(cloneFigurePlacement),
    }
}

export function getCellAtCoord(state: GameState, coord: { i: number; j: number }): Cell | undefined {
    const { n, m } = state.boardParameters
    if (!isCoordInGrid(coord, n, m)) {
        return undefined
    }
    return state.cells[coordToIndex(coord, n)]
}

export function createInitialFiguresSliceFromState(state: GameState): FiguresSlice {
    return splitGameState(state).figures
}

export function createInitialBoardSliceFromState(state: GameState): BoardSlice {
    return splitGameState(state).board
}

export function createInitialFiguresSlice(): FiguresSlice {
    return splitGameState(initialGameState).figures
}

export function createInitialBoardSlice(): BoardSlice {
    return splitGameState(initialGameState).board
}

export function cloneFigureCatalog(catalog: FigureCatalog): FigureCatalog {
    return normalizeFigureCatalog(catalog).map(entry => ({
        id: entry.id,
        ...(entry.team !== undefined ? { team: entry.team } : {}),
        ...(entry.moveDirection !== undefined && entry.moveDirection !== 'up'
            ? { moveDirection: entry.moveDirection }
            : {}),
        states: entry.states.map(state => cloneFigureState(state)),
    }))
}

export { cloneFiguresByCoord }
