import { LegacyBoardSlice, LegacyFiguresSlice } from '../game/state/migrate'
import { SliceHistory } from '../game/types/history'
import { LegacySingleBoardProject, ProjectPersistData, migrateProject, projectToPersistData } from '../projects/types'
import { migrateFigureTeamsFromCatalog } from '../game/figureTeams'

export function normalizeCollabPersistData(data: unknown): ProjectPersistData {
    if (data && typeof data === 'object' && 'boards' in data && 'figureCatalog' in data) {
        const persist = data as ProjectPersistData

        return {
            ...persist,
            figureTeams: migrateFigureTeamsFromCatalog(persist.figureCatalog, persist.figureTeams),
        }
    }

    const legacy = data as {
        state: LegacySingleBoardProject['gameState']
        figuresHistory?: unknown
        boardHistory?: unknown
    }

    const project = migrateProject({
        id: 'collab',
        name: 'collab',
        updatedAt: Date.now(),
        gameState: legacy.state,
        figuresHistory: legacy.figuresHistory as SliceHistory<LegacyFiguresSlice> | undefined,
        boardHistory: legacy.boardHistory as SliceHistory<LegacyBoardSlice> | undefined,
    })

    return projectToPersistData(project)
}
