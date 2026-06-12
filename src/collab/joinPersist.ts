import { historyInit } from '../game/types/history'
import { ProjectPersistData } from '../projects/types'

function buildCollabStateOnlyData(data: ProjectPersistData): ProjectPersistData {
    return {
        figureCatalog: data.figureCatalog,
        catalogHistory: historyInit(),
        activeBoardId: data.activeBoardId,
        boards: data.boards.map(board => ({
            ...board,
            figuresHistory: historyInit(),
            boardHistory: historyInit(),
        })),
    }
}

/** Initial sync sends current boards; guest gets fresh undo stacks. */
export function buildJoinPersistData(data: ProjectPersistData): ProjectPersistData {
    return buildCollabStateOnlyData(data)
}

/** Live sync sends current boards; undo stacks stay local. */
export function buildCollabPatchData(data: ProjectPersistData): ProjectPersistData {
    return buildCollabStateOnlyData(data)
}
