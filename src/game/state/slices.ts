import { Cell, CellParameters } from '../types/cells'
import { FigureCatalog, FigureId, FigurePlacement, FigurePlacementInput } from '../types/figures'
import { cloneFigureState, cloneFigurePlacement, normalizeFigurePlacement } from '../figureView'
import { GameState } from '../types/gameState'
import { BoardParameters } from '../types/boardParameters'
import { BoardStyleRule } from '../types/styleRules'
import { coordKey, coordToIndex, indexToCoord, isCoordInGrid, iterGridCoords } from '../types/coords'
import { initialGameState } from '../utils'

export interface FiguresSlice {
    figuresByCoord: Record<string, FigurePlacement>
    tray: FigurePlacement[]
}

export interface BoardSlice {
    boardParameters: BoardParameters
    styleRules: BoardStyleRule[]
    cellParametersByCoord: Record<string, CellParameters>
}

function normalizeCellFigure(raw: FigureId | FigurePlacementInput | undefined): FigurePlacement | undefined {
    if (!raw) {
        return undefined
    }

    return normalizeFigurePlacement(raw)
}

export function normalizeFiguresSlice(figures: FiguresSlice): FiguresSlice {
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, raw] of Object.entries(figures.figuresByCoord)) {
        figuresByCoord[key] = normalizeFigurePlacement(raw as FigureId | FigurePlacementInput)
    }

    return {
        figuresByCoord,
        tray: figures.tray.map(item => normalizeFigurePlacement(item as FigureId | FigurePlacementInput)),
    }
}

export function splitGameState(state: GameState): { figures: FiguresSlice; board: BoardSlice } {
    const { n } = state.boardParameters
    const figuresByCoord: Record<string, FigurePlacement> = {}
    const cellParametersByCoord: Record<string, CellParameters> = {}

    for (const [index, cell] of (state.cells ?? []).entries()) {
        const key = coordKey(indexToCoord(index, n))
        if (cell.figure) {
            figuresByCoord[key] = normalizeCellFigure(cell.figure)!
        }
        if (cell.parameters && Object.keys(cell.parameters).length > 0) {
            cellParametersByCoord[key] = cell.parameters
        }
    }

    return {
        figures: normalizeFiguresSlice({
            figuresByCoord,
            tray: [...state.tray],
        }),
        board: {
            boardParameters: { ...state.boardParameters },
            styleRules: [...state.styleRules],
            cellParametersByCoord,
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
        const placement = normalizedFigures.figuresByCoord[key]

        return {
            parameters: board.cellParametersByCoord[key],
            figure: placement ? cloneFigurePlacement(placement) : undefined,
        }
    })

    return {
        boardParameters: board.boardParameters,
        styleRules: board.styleRules,
        figureCatalog: catalog.map(entry => ({
            id: entry.id,
            states: entry.states.map(state => cloneFigureState(state)),
            eventRules: entry.eventRules ? [...entry.eventRules] : undefined,
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
    return catalog.map(entry => ({
        id: entry.id,
        states: entry.states.map(state => cloneFigureState(state)),
        eventRules: entry.eventRules?.map(rule => ({
            ...rule,
            params: rule.params ? { ...rule.params } : undefined,
            actions: rule.actions.map(action => ({
                ...action,
                params: { ...action.params },
            })),
        })),
    }))
}
