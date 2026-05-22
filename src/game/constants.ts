import { FigureTypes } from './types/figures'

export const FigureSigns = {
    [FigureTypes.DraughtsManWhite]: '○',
    [FigureTypes.DraughtsKingWhite]: '◎',
    [FigureTypes.DraughtsManBlack]: '●',
    [FigureTypes.DraughtsKingBlack]: '◉',
    [FigureTypes.ChessKingWhite]: '♔',
    [FigureTypes.ChessQueenWhite]: '♕',
    [FigureTypes.ChessRookWhite]: '♖',
    [FigureTypes.ChessKnightWhite]: '♘',
    [FigureTypes.ChessBishopWhite]: '♗',
    [FigureTypes.ChessPawnWhite]: '♙',
    [FigureTypes.ChessKingBlack]: '♚',
    [FigureTypes.ChessQueenBlack]: '♛',
    [FigureTypes.ChessRookBlack]: '♜',
    [FigureTypes.ChessKnightBlack]: '♞',
    [FigureTypes.ChessBishopBlack]: '♝',
    [FigureTypes.ChessPawnBlack]: '♟',
}