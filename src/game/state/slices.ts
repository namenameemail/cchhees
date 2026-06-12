import { Cell, CellParameters } from '../types/cells'
import { FigureCatalog, FigureId } from '../types/figures'
import { GameState } from '../types/gameState'
import { BoardParameters } from '../types/boardParameters'
import { BoardStyleRule } from '../types/styleRules'
import { coordKey, coordToIndex, indexToCoord, isCoordInGrid, iterGridCoords } from '../types/coords'
import { initialGameState } from '../utils'

export interface FiguresSlice {
    figuresByCoord: Record<string, FigureId>
    tray: FigureId[]
}

export interface BoardSlice {
    boardParameters: BoardParameters
    styleRules: BoardStyleRule[]
    cellParametersByCoord: Record<string, CellParameters>
}

export function splitGameState(state: GameState): { figures: FiguresSlice; board: BoardSlice } {
    const { n } = state.boardParameters
    const figuresByCoord: Record<string, FigureId> = {}
    const cellParametersByCoord: Record<string, CellParameters> = {}

    for (const [index, cell] of (state.cells ?? []).entries()) {
        const key = coordKey(indexToCoord(index, n))
        if (cell.figure) {
            figuresByCoord[key] = cell.figure
        }
        if (cell.parameters && Object.keys(cell.parameters).length > 0) {
            cellParametersByCoord[key] = cell.parameters
        }
    }

    return {
        figures: {
            figuresByCoord,
            tray: [...state.tray],
        },
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
    const { n, m } = board.boardParameters
    const cells: Cell[] = iterGridCoords(n, m).map(({ i, j }) => {
        const key = coordKey({ i, j })
        return {
            parameters: board.cellParametersByCoord[key],
            figure: figures.figuresByCoord[key],
        }
    })

    return {
        boardParameters: board.boardParameters,
        styleRules: board.styleRules,
        figureCatalog: catalog.map(entry => ({
            id: entry.id,
            viewParams: { ...entry.viewParams },
            moveRules: entry.moveRules ? [...entry.moveRules] : [],
            jumpOverPieces: entry.jumpOverPieces === true,
        })),
        cells,
        tray: [...figures.tray],
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
        viewParams: { ...entry.viewParams },
        moveRules: entry.moveRules ? entry.moveRules.map(rule => ({ ...rule })) : [],
        jumpOverPieces: entry.jumpOverPieces === true,
    }))
}
