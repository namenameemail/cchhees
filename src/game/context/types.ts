
import { FigureId, FigureMoveRule, FigurePlacement, FigureViewParams, FigureCatalog } from '../types/figures'
import { FigureEventRule } from '../types/events'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { BoardStyleRule } from '../types/styleRules'
import { ConnectionParams } from '../types/connections'
import { FiguresSlice, BoardSlice } from '../state/slices'
import { CellCoord } from '../types/coords'
import { ProjectPersistData } from '../../projects/types'
import { CollabOp } from '../../collab/ops'

export interface GameContextValue {
    mode: Mode
    state: GameState

    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    figureCatalog?: FigureCatalog
    catalogHistory?: SliceHistory<FigureCatalog>
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
    setActiveCell: (value: CellCoord | undefined, reason?: string) => void

    previewCellStyleRuleIndex?: number
    setPreviewCellStyleRuleIndex: (index: number | undefined) => void
    moveActiveCellFigureTo: (to: CellCoord) => void
    setCellFigure: (coord: CellCoord, figure: FigureId) => void
    setCellParameters: (coord: CellCoord) => void
    toTray: (coord: CellCoord) => void

    setBoardParameters: (value: BoardParameters) => void
    /** Bumps when a board-parameters edit is rejected (e.g. shrink warning) so forms resync inputs. */
    boardParametersFormKey: number
    setStyleRules: (value: BoardStyleRule[]) => void

    setMode: (value) => void
    setTray: (value: FigurePlacement[]) => void
    setCells: (value) => void
    setFigureStateViewParams: (figureId: FigureId, stateIndex: number, params: FigureViewParams) => void
    setFigureStateMoveRules: (
        figureId: FigureId,
        stateIndex: number,
        moveRules: FigureMoveRule[],
        jumpOverPieces?: boolean,
    ) => void
    addFigureState: (figureId: FigureId) => void
    removeFigureState: (figureId: FigureId, stateIndex: number) => void
    setFigureEventRules: (figureId: FigureId, eventRules: FigureEventRule[]) => void
    addFigure: () => void
    removeFigure: (figureId: FigureId) => void
    clearAssetReferences: (assetId: number) => void
    applyRemotePersistData: (data: ProjectPersistData) => void
    applyRemoteOps: (ops: CollabOp[]) => GameState
}
