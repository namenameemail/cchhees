import { historyInit } from './context/history'
import { GameContextValue } from './context/types'
import { Cell, CellShape } from './types/cells'
import { BoardBackgroundImageFit } from './types/boardParameters'
import { getDefaultSvgCellParams } from './cellSvgSize'
import { createDefaultFigureCatalog } from './figureView'
import { GameState } from './types/gameState'
import { Mode } from './types'

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
        background: 'white',
        backgroundAssetId: null,
        backgroundImageFit: BoardBackgroundImageFit.tile,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: 'black',
    },

    styleRules: [],
    figureCatalog: createDefaultFigureCatalog(),
}

const mockFn = () => {
}
export const defaultGameContextValue: GameContextValue = {
    mode: Mode.Game,
    state: initialGameState,
    figuresHistory: historyInit(),
    boardHistory: historyInit(),
    cellParametersBrushState: {
        paramsByShape: {
            [CellShape.img]: getDefaultSvgCellParams(),
            [CellShape.rect]: {},
            [CellShape.circle]: {},
        }
    },
    setCellParametersBrushState: mockFn,
    connectionParamsBrushState: {},
    setConnectionParamsBrushState: mockFn,
    undoFigures: mockFn,
    redoFigures: mockFn,
    undoBoard: mockFn,
    redoBoard: mockFn,
    setBoardParameters: mockFn,
    setStyleRules: mockFn,

    setMode: mockFn,
    setActiveFigure: mockFn,
    setActiveCell: mockFn,
    moveActiveCellFigureTo: mockFn,
    setCellFigure: mockFn,
    setCellParameters: mockFn,
    toTray: mockFn,
    setTray: mockFn,
    setCells: mockFn,
    setFigureDefinition: mockFn,
    setFigureMoveRules: mockFn,
    addFigure: mockFn,
    removeFigure: mockFn,
    clearAssetReferences: mockFn,
    applyRemotePersistData: mockFn,
    applyRemoteOps: () => initialGameState,
}
