import { SvgCellSizeParams } from '../cellSvgSize'
import { FigureEventCondition, FigureEventRule } from './events'

export type FigureId = string

export interface FigurePlacement {
    instanceId: string
    figureId: FigureId
    stateIndex?: number
}

/** Legacy persisted / collab payload may omit instanceId until normalized */
export type FigurePlacementInput = FigureId | {
    instanceId?: string
    figureId: FigureId
    stateIndex?: number
}

export interface FigureViewParams extends SvgCellSizeParams {
    symbol?: string
    fontSize?: number
    color?: string
    fontAssetId?: number | null
    assetId?: number | null
    textShadowEnabled?: boolean
    textShadowColor?: string
    textShadowOffsetX?: number
    textShadowOffsetY?: number
    textShadowBlur?: number
    borderRadius?: number
    strokeWidth?: number
    strokeColor?: string
    strokeDasharray?: string
}

export type FigureMoveDirection = 'up' | 'down' | 'left' | 'right'

export type FigureMoveVariantKind = 'empty' | 'capture' | 'jumpOver'

export interface FigureMoveVariant {
    enabled: boolean
    length: number
    allowOwnTeam?: boolean
    /** empty variant: path checked along min unit steps (gcd-normalized direction) */
    emptyPath?: boolean
    conditions?: FigureEventCondition[]
}

export interface FigureMoveRule {
    x: number
    y: number
    empty: FigureMoveVariant
    capture: FigureMoveVariant
    jumpOver: FigureMoveVariant
}

/** @deprecated migrated to FigureMoveRule variants */
export type LegacyFigureMoveRuleLanding = 'empty' | 'capture' | 'any' | 'jumpOver'

/** @deprecated migrated to FigureMoveRule variants */
export interface LegacyFigureMoveRule {
    x: number
    y: number
    n?: number
    landing?: LegacyFigureMoveRuleLanding
}

export interface FigureState {
    viewParams: FigureViewParams
    moveRules?: FigureMoveRule[]
    /** @deprecated migrated into capture/jumpOver variants */
    jumpOverPieces?: boolean
    /** @deprecated migrated into capture variant */
    canStepOnOwnTeam?: boolean
    /** @deprecated migrated into jumpOver variant */
    canJumpOverOwnTeam?: boolean
}

export interface FigureDefinition {
    id: FigureId
    states: FigureState[]
    team?: number
    moveDirection?: FigureMoveDirection
    /** @deprecated use board.eventRules */
    eventRules?: FigureEventRule[]
}

/** @deprecated Migrated to FigureDefinition.states */
export interface LegacyFigureDefinition {
    id: FigureId
    viewParams: FigureViewParams
    moveRules?: LegacyFigureMoveRule[]
    jumpOverPieces?: boolean
    canStepOnOwnTeam?: boolean
    canJumpOverOwnTeam?: boolean
}

export type FigureCatalog = FigureDefinition[]

export interface FigureTeam {
    id: number
    name: string
    /** @deprecated migrated to boardParameters.teamMoveDirections */
    moveDirection?: FigureMoveDirection
}

export type FigureTeams = FigureTeam[]

/** @deprecated Legacy enum ids used only for migration defaults */
export enum FigureTypes {
    DraughtsManWhite = 'DraughtsManWhite',
    DraughtsKingWhite = 'DraughtsKingWhite',
    DraughtsManBlack = 'DraughtsManBlack',
    DraughtsKingBlack = 'DraughtsKingBlack',
    ChessKingWhite = 'ChessKingWhite',
    ChessQueenWhite = 'ChessQueenWhite',
    ChessRookWhite = 'ChessRookWhite',
    ChessKnightWhite = 'ChessKnightWhite',
    ChessBishopWhite = 'ChessBishopWhite',
    ChessPawnWhite = 'ChessPawnWhite',
    ChessKingBlack = 'ChessKingBlack',
    ChessQueenBlack = 'ChessQueenBlack',
    ChessRookBlack = 'ChessRookBlack',
    ChessKnightBlack = 'ChessKnightBlack',
    ChessBishopBlack = 'ChessBishopBlack',
    ChessPawnBlack = 'ChessPawnBlack',
}

/** @deprecated Migrated to figureCatalog */
export type FigureDefinitions = Partial<Record<FigureId, FigureViewParams>>
