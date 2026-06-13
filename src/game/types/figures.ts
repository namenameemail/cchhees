import { SvgCellSizeParams } from '../cellSvgSize'

export type FigureId = string

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

export interface FigureMoveRule {
    x: number
    y: number
    n?: number
}

export interface FigureState {
    viewParams: FigureViewParams
    moveRules?: FigureMoveRule[]
    jumpOverPieces?: boolean
}

export interface FigureDefinition {
    id: FigureId
    states: FigureState[]
}

/** @deprecated Migrated to FigureDefinition.states */
export interface LegacyFigureDefinition {
    id: FigureId
    viewParams: FigureViewParams
    moveRules?: FigureMoveRule[]
    jumpOverPieces?: boolean
}

export type FigureCatalog = FigureDefinition[]

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
