
import { FigureId, FigureMoveRule, FigureMoveDirection, FigurePlacement, FigureViewParams, FigureCatalog, FigureTeams } from '../types/figures'
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
import { FigureBoardAnimationState } from '../figureAnimation/playStepAnimation'

export interface GameContextValue {
    mode: Mode
    state: GameState
    /** Authoritative figure stacks; uses animation overlay slice while a move is animating. */
    figuresSlice: FiguresSlice

    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    figureCatalog: FigureCatalog
    figureTeams: FigureTeams
    catalogHistory: SliceHistory<FigureCatalog>
    undoFigures: () => void
    redoFigures: () => void
    undoBoard: () => void
    redoBoard: () => void

    cellParametersBrushState: CellParameters
    setCellParametersBrushState: (value: CellParameters) => void

    connectionParamsBrushState: ConnectionParams
    setConnectionParamsBrushState: (value: ConnectionParams) => void

    activeFigure?: FigureId
    setActiveFigure: (value: FigureId | undefined) => void

    getFigureStateIndex: (figureId: FigureId) => number
    setFigureStateIndex: (figureId: FigureId, stateIndex: number) => void

    isFigureArrangeEnabled: (figureId: FigureId) => boolean
    toggleFigureArrange: (figureId: FigureId) => void

    isFreeMoveEnabled: boolean
    toggleFreeMove: () => void

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

    setMode: (value: Mode) => void
    setTray: (value: FigurePlacement[]) => void
    setCells: (value: GameState['cells']) => void
    setFigureStateViewParams: (figureId: FigureId, stateIndex: number, params: FigureViewParams) => void
    setFigureStateMoveRules: (
        figureId: FigureId,
        stateIndex: number,
        moveRules: FigureMoveRule[],
        jumpOverPieces?: boolean,
        canStepOnOwnTeam?: boolean,
        canJumpOverOwnTeam?: boolean,
    ) => void
    addFigureState: (figureId: FigureId) => void
    removeFigureState: (figureId: FigureId, stateIndex: number) => void
    setFigureTeam: (figureId: FigureId, team: number | undefined) => void
    setFigureTeams: (teams: FigureTeams) => void
    setTeamMembers: (teamId: number, figureIds: FigureId[]) => void
    setFigureMoveDirection: (figureId: FigureId, moveDirection: FigureMoveDirection) => void
    setBoardEventRules: (eventRules: FigureEventRule[]) => void
    addFigure: () => void
    removeFigure: (figureId: FigureId) => void
    clearAssetReferences: (assetId: number) => void
    applyRemotePersistData: (data: ProjectPersistData) => void
    applyRemoteOps: (ops: CollabOp[]) => GameState
    isFigureAnimating: boolean
    figureBoardAnimations: FigureBoardAnimationState
}
