import { useEffect } from 'react'
import { useCollab } from '../CollabProvider'
import { useGameContext } from '../../game/context'
import { useProjectContext } from '../../projects/ProjectContext'
import { getProjectPersistData } from '../../projects/projectPersist'
import { ProjectPersistData } from '../../projects/types'

export function CollabGameBridge() {
    const { registerGameBridge } = useCollab()
    const { currentProject, activeBoardId } = useProjectContext()
    const {
        state,
        figuresHistory,
        boardHistory,
        figureCatalog,
        catalogHistory,
        applyRemotePersistData,
        applyRemoteOps,
    } = useGameContext()

    useEffect(() => {
        const bridge = {
            getPersistData: (): ProjectPersistData | null => {
                if (!currentProject || !activeBoardId) {
                    return null
                }

                const base = getProjectPersistData(currentProject)

                return {
                    ...base,
                    figureCatalog: figureCatalog ?? base.figureCatalog,
                    catalogHistory: catalogHistory ?? base.catalogHistory,
                    activeBoardId,
                    boards: base.boards.map(board => (
                        board.id === activeBoardId
                            ? {
                                ...board,
                                gameState: state,
                                figuresHistory,
                                boardHistory,
                            }
                            : board
                    )),
                }
            },
            applyRemotePersist: applyRemotePersistData,
            applyRemoteOps,
        }

        registerGameBridge(bridge)

        return () => registerGameBridge(null)
    }, [
        currentProject,
        activeBoardId,
        state,
        figuresHistory,
        boardHistory,
        figureCatalog,
        catalogHistory,
        applyRemotePersistData,
        applyRemoteOps,
        registerGameBridge,
    ])

    return null
}
