import { ProjectPersistData } from '../../projects/types'
import { SliceHistory } from '../types/history'
import { FigureCatalog } from '../types/figures'
import { GameState } from '../types/gameState'
import {
    BoardSlice,
    FiguresSlice,
    composeGameState,
    createInitialBoardSliceFromState,
    createInitialFiguresSliceFromState,
    cloneFigureCatalog,
} from '../state/slices'

export function applyRemotePersistDataFromProject(data: ProjectPersistData): {
    boardId: string
    figuresSlice: FiguresSlice
    boardSlice: BoardSlice
    figureCatalog: FigureCatalog
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    catalogHistory: SliceHistory<FigureCatalog>
    state: GameState
} | null {
    const board = data.boards.find(item => item.id === data.activeBoardId) ?? data.boards[0]

    if (!board) {
        return null
    }

    const figureCatalog = cloneFigureCatalog(data.figureCatalog)
    const figuresSlice = createInitialFiguresSliceFromState(board.gameState)
    const boardSlice = createInitialBoardSliceFromState(board.gameState)

    return {
        boardId: board.id,
        figuresSlice,
        boardSlice,
        figureCatalog,
        figuresHistory: board.figuresHistory,
        boardHistory: board.boardHistory,
        catalogHistory: data.catalogHistory,
        state: composeGameState(figuresSlice, boardSlice, figureCatalog),
    }
}
