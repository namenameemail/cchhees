
import { FigureId, FigureViewParams } from '../types/figures'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { BoardStyleRule } from '../types/styleRules'
import { ConnectionParams } from '../types/connections'
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

    activeFigure?: FigureId
    setActiveFigure: (value: FigureId | undefined) => void

    activeCell?: CellCoord
    setActiveCell: (value: CellCoord | undefined) => void
    moveActiveCellFigureTo: (to: CellCoord) => void
    setCellFigure: (coord: CellCoord, figure: FigureId) => void
    setCellParameters: (coord: CellCoord) => void
    toTray: (coord: CellCoord) => void

    setBoardParameters: (value: BoardParameters) => void
    setStyleRules: (value: BoardStyleRule[]) => void

    setMode: (value) => void
    setTray: (value: FigureId[]) => void
    setCells: (value) => void
    setFigureDefinition: (figureId: FigureId, params: FigureViewParams) => void
    addFigure: () => void
    removeFigure: (figureId: FigureId) => void
    clearAssetReferences: (assetId: number) => void
}
