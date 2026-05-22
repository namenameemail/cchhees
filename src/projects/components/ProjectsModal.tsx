import React, { FC, useCallback, useState } from 'react'
import { useProjectContext } from '../ProjectContext'
import styles from './ProjectsModal.module.css'

export interface ProjectsModalProps {
    open: boolean
    onClose: () => void
}

function formatUpdatedAt(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
}

export const ProjectsModal: FC<ProjectsModalProps> = ({ open, onClose }) => {
    const {
        projects,
        currentProjectId,
        createProject,
        renameProject,
        deleteProject,
        switchProject,
    } = useProjectContext()

    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')

    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }, [onClose])

    const handleCreate = useCallback(async () => {
        await createProject()
    }, [createProject])

    const handleSwitch = useCallback(async (id: string) => {
        await switchProject(id)
        onClose()
    }, [switchProject, onClose])

    const handleStartRename = useCallback((id: string, name: string) => {
        setRenamingId(id)
        setRenameValue(name)
    }, [])

    const handleCancelRename = useCallback(() => {
        setRenamingId(null)
        setRenameValue('')
    }, [])

    const handleConfirmRename = useCallback(async (id: string) => {
        await renameProject(id, renameValue)
        handleCancelRename()
    }, [renameProject, renameValue, handleCancelRename])

    const handleDelete = useCallback(async (id: string, name: string) => {
        if (!confirm(`Удалить проект «${name}»?`)) {
            return
        }
        await deleteProject(id)
    }, [deleteProject])

    if (!open) {
        return null
    }

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Проекты</h2>
                    <button type="button" className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.list}>
                    {projects.map(project => {
                        const isCurrent = project.id === currentProjectId
                        const isRenaming = renamingId === project.id

                        return (
                            <div
                                key={project.id}
                                className={`${styles.item} ${isCurrent ? styles.itemCurrent : ''}`}
                            >
                                <div className={styles.itemMain}>
                                    {isRenaming ? (
                                        <input
                                            className={styles.renameInput}
                                            value={renameValue}
                                            autoFocus
                                            onChange={e => setRenameValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    void handleConfirmRename(project.id)
                                                }
                                                if (e.key === 'Escape') {
                                                    handleCancelRename()
                                                }
                                            }}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.nameButton}
                                            onClick={() => void handleSwitch(project.id)}
                                        >
                                            {project.name}
                                            {isCurrent ? ' (текущий)' : ''}
                                        </button>
                                    )}
                                    <span className={styles.updatedAt}>
                                        {formatUpdatedAt(project.updatedAt)}
                                    </span>
                                </div>

                                <div className={styles.actions}>
                                    {isRenaming ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => void handleConfirmRename(project.id)}
                                            >
                                                OK
                                            </button>
                                            <button type="button" onClick={handleCancelRename}>
                                                Отмена
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleStartRename(project.id, project.name)}
                                            >
                                                Переименовать
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleDelete(project.id, project.name)}
                                            >
                                                Удалить
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className={styles.footer}>
                    <button type="button" className={styles.createButton} onClick={() => void handleCreate()}>
                        Новый проект
                    </button>
                </div>
            </div>
        </div>
    )
}
