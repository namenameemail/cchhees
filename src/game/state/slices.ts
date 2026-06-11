import { Cell, CellParameters } from '../types/cells'
import { BoardConditionItem } from '../types/conditions'
import { BoardConnectionsConditionItem } from '../types/connections'
import { FigureCatalog, FigureId } from '../types/figures'
import { GameState } from '../types/gameState'
import { BoardParameters } from '../types/boardParameters'
import { coordKey, coordToIndex, indexToCoord, isCoordInGrid, iterGridCoords } from '../types/coords'
import { migrateToFigureCatalog } from '../figureView'
import { initialGameState } from '../utils'

export interface FiguresSlice {
    figuresByCoord: Record<string, FigureId>
    tray: FigureId[]
}

export interface BoardSlice {
    boardParameters: BoardParameters
    boardConditions: BoardConditionItem[]
    connectionsConditions: BoardConnectionsConditionItem[]
    cellParametersByCoord: Record<string, CellParameters>
    figureCatalog: FigureCatalog
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
            boardConditions: [...state.boardConditions],
            connectionsConditions: [...state.connectionsConditions],
            cellParametersByCoord,
            figureCatalog: migrateToFigureCatalog(state),
        },
    }
}

export function composeGameState(figures: FiguresSlice, board: BoardSlice): GameState {
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
        boardConditions: board.boardConditions,
        connectionsConditions: board.connectionsConditions,
        figureCatalog: board.figureCatalog.map(entry => ({
            id: entry.id,
            viewParams: { ...entry.viewParams },
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
