import { LegacyBoardSlice, LegacyFiguresSlice } from '../game/state/migrate'
import { SliceHistory } from '../game/types/history'
import { LegacySingleBoardProject, ProjectPersistData, migrateProject, projectToPersistData } from '../projects/types'

export function normalizeCollabPersistData(data: unknown): ProjectPersistData {
    if (data && typeof data === 'object' && 'boards' in data && 'figureCatalog' in data) {
        return data as ProjectPersistData
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
