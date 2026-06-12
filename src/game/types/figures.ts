import { SvgCellSizeParams } from '../cellSvgSize'

export type FigureId = string

export enum FigureDisplayType {
    symbol = 'symbol',
    image = 'image',
}

export interface FigureViewParams extends SvgCellSizeParams {
    displayType?: FigureDisplayType
    symbol?: string
    fontSize?: number
    color?: string
    fontAssetId?: number | null
    assetId?: number | null
}

export interface FigureMoveRule {
    x: number
    y: number
    n?: number
}

export interface FigureDefinition {
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
