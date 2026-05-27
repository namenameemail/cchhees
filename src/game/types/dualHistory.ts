import { FiguresSlice, BoardSlice } from '../state/slices'
import { SliceHistory } from '../types/history'

export interface DualHistory {
    figures: SliceHistory<FiguresSlice>
    board: SliceHistory<BoardSlice>
}

export interface ShrinkWarningState {
    open: boolean
    count: number
    pendingBoardParameters: import('../types/boardParameters').BoardParameters | null
}
