import { splitGameState, composeGameState } from '../game/state/slices'
import { ProjectPersistData } from '../projects/types'
import { applyCollabOp, CollabOp, isBoardScopedCollabOp, resolveCollabOpBoardId } from './ops'
import { normalizeFigureTeams } from '../game/figureTeams'

/** True when incoming ops should refresh the board currently shown in GameProvider. */
export function opsAffectVisibleGameState(
    ops: CollabOp[],
    visibleBoardId: string,
    fallbackBoardId: string,
): boolean {
    for (const op of ops) {
        if (!isBoardScopedCollabOp(op)) {
            return true
        }

        const boardId = resolveCollabOpBoardId(op, fallbackBoardId)

        if (boardId === visibleBoardId) {
            return true
        }
    }

    return false
}

export function applyOpsToPersistData(
    data: ProjectPersistData,
    ops: CollabOp[],
    viewingBoardId?: string,
): ProjectPersistData {
    let figureCatalog = data.figureCatalog
    let figureTeams = data.figureTeams
    let catalogHistory = data.catalogHistory
    const boards = data.boards.map(board => ({ ...board }))

    for (const op of ops) {
        if (op.kind === 'figure-teams') {
            figureTeams = normalizeFigureTeams(op.teams)
            continue
        }

        if (!isBoardScopedCollabOp(op)) {
            if (op.kind === 'catalog-sync') {
                figureCatalog = op.catalog
                continue
            }

            const targetBoardId = viewingBoardId ?? data.activeBoardId
            const boardIndex = boards.findIndex(item => item.id === targetBoardId)

            if (boardIndex < 0) {
                continue
            }

            const board = boards[boardIndex]!
            const { figures, board: boardSlice } = splitGameState(board.gameState)
            const next = applyCollabOp(figures, boardSlice, figureCatalog, op)

            figureCatalog = next.catalog
            boards[boardIndex] = {
                ...board,
                gameState: composeGameState(next.figures, next.board, next.catalog),
            }
            continue
        }

        const boardId = resolveCollabOpBoardId(op, data.activeBoardId)
        const boardIndex = boards.findIndex(item => item.id === boardId)

        if (boardIndex < 0) {
            continue
        }

        const board = boards[boardIndex]!
        const { figures, board: boardSlice } = splitGameState(board.gameState)
        const next = applyCollabOp(figures, boardSlice, figureCatalog, op)

        figureCatalog = next.catalog
        boards[boardIndex] = {
            ...board,
            gameState: composeGameState(next.figures, next.board, next.catalog),
        }
    }

    return {
        figureCatalog,
        figureTeams,
        catalogHistory,
        boards,
        activeBoardId: data.activeBoardId,
    }
}
