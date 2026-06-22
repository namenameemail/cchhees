import React, { FC, useMemo } from 'react'
import { GameProvider } from '../game/context'
import {
    createShowcaseCatalog,
    createShowcaseFigureTeams,
    createShowcaseGameState,
    SHOWCASE_BOARD_ID,
    showcaseHistories,
} from './demoCatalog'

export const ShowcaseGameShell: FC<{ children: React.ReactNode }> = ({ children }) => {
    const catalog = useMemo(() => createShowcaseCatalog(), [])
    const initialState = useMemo(() => createShowcaseGameState(catalog), [catalog])
    const figureTeams = useMemo(() => createShowcaseFigureTeams(catalog), [catalog])

    return (
        <GameProvider
            activeBoardId={SHOWCASE_BOARD_ID}
            initialState={initialState}
            initialCatalog={catalog}
            initialFiguresHistory={showcaseHistories.figures}
            initialBoardHistory={showcaseHistories.board}
            initialCatalogHistory={showcaseHistories.catalog}
            initialFigureTeams={figureTeams}
        >
            {children}
        </GameProvider>
    )
}
