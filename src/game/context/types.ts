
import { FigureTypes } from '../types/figures'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { BoardConditionItem } from '../types/conditions'
import { BoardConnectionsConditionItem, ConnectionParams } from '../types/connections'
import { FiguresSlice, BoardSlice } from '../state/slices'
import { CellCoord } from '../types/coords'

export interface GameContextValue {
    mode: Mode
    state: GameState

    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    undoFigures: () => void
    redoFigures: () => void
    undoBoard: () => void
    redoBoard: () => void

    cellParametersBrushState: CellParameters
    setCellParametersBrushState: (value) => void

    connectionParamsBrushState: ConnectionParams
    setConnectionParamsBrushState: (value) => void

    activeFigure?: string
    setActiveFigure: (value) => void

    activeCell?: CellCoord
    setActiveCell: (value: CellCoord | undefined) => void
    moveActiveCellFigureTo: (to: CellCoord) => void
    setCellFigure: (coord: CellCoord, figure: FigureTypes) => void
    setCellParameters: (coord: CellCoord) => void
    toTray: (coord: CellCoord) => void

    setBoardParameters: (value: BoardParameters) => void
    setBoardConnectionsConditions: (value: BoardConnectionsConditionItem[]) => void
    setBoardConditions: (value: BoardConditionItem[]) => void

    setMode: (value) => void
    setTray: (value) => void
    setCells: (value) => void
    clearAssetReferences: (assetId: number) => void
}
