
import { FigureTypes } from '../types/figures'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { GameStateHistory } from '../types/history'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { BoardConditionItem } from '../types/conditions'
import { BoardConnectionsConditionItem, ConnectionParams } from '../types/connections'

export interface GameContextValue {
    mode: Mode
    state: GameState

    stateHistory: GameStateHistory
    undo: () => void
    redo: () => void

    cellParametersBrushState: CellParameters
    setCellParametersBrushState: (value) => void

    connectionParamsBrushState: ConnectionParams
    setConnectionParamsBrushState: (value) => void

    activeFigure?: string
    setActiveFigure: (value) => void

    activeCell?: number
    setActiveCell: (value) => void
    moveActiveCellFigureTo: (to: number) => void
    setCellFigure: (index: number, figure: FigureTypes) => void
    setCellParameters: (index: number) => void
    toTray: (index: number) => void


    setBoardParameters: (value: BoardParameters) => void
    setBoardConnectionsConditions: (value: BoardConnectionsConditionItem[]) => void
    setBoardConditions: (value: BoardConditionItem[]) => void

    setMode: (value) => void
    setTray: (value) => void
    setCells: (value) => void
}