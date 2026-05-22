import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useProjectContext } from '../ProjectContext'
import styles from './TopBar.module.css'

export const TOP_BAR_HEIGHT = 32

export interface TopBarProps {
    onOpenProjects: () => void
}

function FileIcon() {
    return (
        <svg
            className={styles.fileIcon}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            <path d="M14 2v6h6" />
        </svg>
    )
}

export const TopBar: FC<TopBarProps> = ({ onOpenProjects }) => {
    const { currentProject, isReady, renameProject } = useProjectContext()
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [isRenaming])

    const handleStartRename = useCallback(() => {
        if (!currentProject) {
            return
        }
        setRenameValue(currentProject.name)
        setIsRenaming(true)
    }, [currentProject])

    const handleCancelRename = useCallback(() => {
        setIsRenaming(false)
        setRenameValue('')
    }, [])

    const handleConfirmRename = useCallback(async () => {
        if (!currentProject) {
            handleCancelRename()
            return
        }

        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== currentProject.name) {
            await renameProject(currentProject.id, trimmed)
        }
        handleCancelRename()
    }, [currentProject, renameValue, renameProject, handleCancelRename])

    return (
        <header className={styles.topBar}>
            <button
                type="button"
                className={styles.projectsButton}
                onClick={onOpenProjects}
                disabled={!isReady}
                title="Проекты"
                aria-label="Открыть список проектов"
            >
                <FileIcon />
            </button>

            {isRenaming ? (
                <input
                    ref={inputRef}
                    className={styles.renameInput}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => void handleConfirmRename()}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            void handleConfirmRename()
                        }
                        if (e.key === 'Escape') {
                            handleCancelRename()
                        }
                    }}
                />
            ) : (
                <div
                    className={styles.projectName}
                    onDoubleClick={handleStartRename}
                    title="Двойной клик — переименовать"
                >
                    {isReady ? currentProject?.name ?? 'Без проекта' : 'Загрузка...'}
                </div>
            )}
        </header>
    )
}
