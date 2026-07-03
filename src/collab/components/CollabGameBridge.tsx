import { useEffect, useMemo } from 'react'
import { useCollab } from '../CollabProvider'
import { useGameContext } from '../../game/context'
import { useProjectContext } from '../../projects/ProjectContext'
import { getProjectPersistData } from '../../projects/projectPersist'
import { ProjectPersistData } from '../../projects/types'
import { useDiceContext } from '../../game/components/Dice/DiceContext'
import { CollabOp } from '../ops'

export function CollabGameBridge() {
    const { registerGameBridge, createCollabOnOp } = useCollab()
    const { currentProject, activeBoardId } = useProjectContext()
    const {
        state,
        figuresHistory,
        boardHistory,
        figureCatalog,
        figureTeams,
        catalogHistory,
        applyRemotePersistData,
        applyRemoteOps,
    } = useGameContext()
    const {
        handleExternalThrow, subscribeToThrow,
        handleExternalSettle, subscribeToSettle,
        handleExternalModelChange, subscribeToModelChange,
    } = useDiceContext()

    const collabOnOp = useMemo(() => createCollabOnOp(), [createCollabOnOp])

    useEffect(() => {
        return subscribeToThrow(spin => {
            collabOnOp({ kind: 'dice-throw', spin })
        })
    }, [subscribeToThrow, collabOnOp])

    useEffect(() => {
        return subscribeToModelChange((modelAssetId, builtinModelPath) => {
            collabOnOp({ kind: 'dice-model', modelAssetId, builtinModelPath })
        })
    }, [subscribeToModelChange, collabOnOp])

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
                    figureTeams: figureTeams ?? base.figureTeams,
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
            onRemoteOps: (ops: CollabOp[]) => {
                ops.forEach(op => {
                    if (op.kind === 'dice-throw') {
                        handleExternalThrow(op.spin)
                    } else if (op.kind === 'dice-model') {
                        handleExternalModelChange(op.modelAssetId, op.builtinModelPath)
                    }
                })
            },
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
        figureTeams,
        catalogHistory,
        applyRemotePersistData,
        applyRemoteOps,
        registerGameBridge,
        handleExternalThrow,
        handleExternalModelChange,
    ])

    return null
}
