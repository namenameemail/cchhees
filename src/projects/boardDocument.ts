import { GameState } from '../game/types/gameState'
import { SliceHistory, historyInit } from '../game/types/history'
import { FiguresSlice, BoardSlice } from '../game/state/slices'
import { initialGameState } from '../game/utils'
import { BoardDocument } from './types'

export function createEmptyBoardDocument(
    name: string,
    gameState?: GameState,
    figuresHistory?: SliceHistory<FiguresSlice>,
    boardHistory?: SliceHistory<BoardSlice>,
): BoardDocument {
    return {
        id: crypto.randomUUID(),
        name,
        gameState: gameState ? structuredClone(gameState) : structuredClone(initialGameState),
        figuresHistory: figuresHistory ?? historyInit(),
        boardHistory: boardHistory ?? historyInit(),
    }
}

export function resolveBoardName(existing: BoardDocument[], requested?: string): string {
    if (requested?.trim()) {
        return requested.trim()
    }

    const prefix = 'Доска '
    let index = existing.length + 1
    const names = new Set(existing.map(board => board.name))

    while (names.has(`${prefix}${index}`)) {
        index += 1
    }

    return `${prefix}${index}`
}
