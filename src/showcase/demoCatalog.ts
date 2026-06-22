import { historyInit } from '../game/context/history'
import { composeGameState, splitGameState } from '../game/state/slices'
import { createDefaultFigureCatalog, createDefaultFigureState } from '../game/figureView'
import { FigureCatalog, FigureTeams } from '../game/types/figures'
import { BoardSlice, FiguresSlice } from '../game/state/slices'
import { GameState } from '../game/types/gameState'
import { initialGameState } from '../game/utils'
import { migrateFigureTeamsFromCatalog } from '../game/figureTeams'

export const SHOWCASE_BOARD_ID = 'showcase'

export function createShowcaseCatalog(): FigureCatalog {
    const base = createDefaultFigureCatalog()

    return [
        {
            id: 'demo-rook',
            states: [
                { ...createDefaultFigureState('demo-rook'), viewParams: { symbol: 'R', color: '#333' } },
                { ...createDefaultFigureState('demo-rook'), viewParams: { symbol: 'R+', color: '#666' } },
            ],
            team: 0,
        },
        {
            id: 'demo-bishop',
            states: [{ ...createDefaultFigureState('demo-bishop'), viewParams: { symbol: 'B', color: '#06c' } }],
            team: 0,
        },
        {
            id: 'demo-knight',
            states: [{ ...createDefaultFigureState('demo-knight'), viewParams: { symbol: 'N', color: '#390' } }],
            team: 1,
        },
        {
            id: 'demo-pawn',
            states: [{ ...createDefaultFigureState('demo-pawn'), viewParams: { symbol: 'P', color: '#c00' } }],
            team: 1,
        },
        ...base.filter(entry => !['demo-rook', 'demo-bishop', 'demo-knight', 'demo-pawn'].includes(entry.id)),
    ]
}

export function createShowcaseGameState(catalog: FigureCatalog): GameState {
    const { figures, board } = splitGameState(initialGameState)

    return composeGameState(figures, board, catalog)
}

export function createShowcaseFigureTeams(catalog: FigureCatalog): FigureTeams {
    return migrateFigureTeamsFromCatalog(catalog, [
        { id: 0, name: 'Белые' },
        { id: 1, name: 'Чёрные' },
    ])
}

export const showcaseHistories = {
    figures: historyInit<FiguresSlice>(),
    board: historyInit<BoardSlice>(),
    catalog: historyInit<FigureCatalog>(),
}
