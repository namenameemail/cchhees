import { historyInit } from './context/history'
import { GameContextValue } from './context/types'
import { Cell, CellShape } from './types/cells'
import { GameState } from './types/gameState'
import { Mode } from './types'


export const indexToIJ = (index: number, width: number): { i, j } => ({
    i: index % width,
    j: Math.floor(index / width),
})
export const ijToIndex = ({ i, j }, width: number): number => j * width + i

export const getInitialCell = (): Cell => {
    return {
        parameters: {},
        figure: undefined,
    }
}

export const getCells = (width: number, height: number, cells?: Cell[]) => {
    const length = (+width) * (+height)
    if (cells) {
        if (cells.length > length) {
            return cells.slice(0, length)
        } else {
            return [...cells, ...(new Array(length - cells.length)).fill({}).map(getInitialCell)]
        }
    } else {
        return (new Array(length)).fill({}).map(getInitialCell)
    }
}


const defaultWidth = 10
const defaultHeight = 3
export const initialGameState: GameState = {

    cells: getCells(defaultWidth, defaultHeight),
    tray: [],

    boardParameters: {
        n: defaultWidth,
        m: defaultHeight,
        cellWidth: 20,
        cellHeight: 20,
        cellXDistance: 50,
        cellYDistance: 50,
        swapOnEat: false,
    },

    boardConditions: [],
    connectionsConditions: [],
}

const mockFn = () => {
}
export const defaultGameContextValue: GameContextValue = {
    mode: Mode.Game,
    state: initialGameState,
    stateHistory: historyInit(),
    cellParametersBrushState: {
        paramsByShape: {
            [CellShape.svg]: {},
            [CellShape.rect]: {},
            [CellShape.circle]: {},
        }
    },
    setCellParametersBrushState: mockFn,
    connectionParamsBrushState: {},
    setConnectionParamsBrushState: mockFn,
    undo: mockFn,
    redo: mockFn,
    setBoardParameters: mockFn,
    setBoardConnectionsConditions: mockFn,
    setBoardConditions: mockFn,

    setMode: mockFn,
    setActiveFigure: mockFn,
    setActiveCell: mockFn,
    moveActiveCellFigureTo: mockFn,
    setCellFigure: mockFn,
    setCellParameters: mockFn,
    toTray: mockFn,
    setTray: mockFn,
    setCells: mockFn,
}
