import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { useProjectContext } from '../../projects/ProjectContext'
import styles from './BoardTabs.module.css'

export interface BoardTabsProps {
    className?: string
}

export const BoardTabs: FC<BoardTabsProps> = ({ className }) => {
    const {
        boards,
        activeBoardId,
        switchBoard,
        createBoard,
        renameBoard,
        deleteBoard,
    } = useProjectContext()

    const scrollRef = useRef<HTMLDivElement>(null)
    const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')

    useEffect(() => {
        const scrollEl = scrollRef.current

        if (!scrollEl) {
            return
        }

        const onWheel = (event: WheelEvent) => {
            if (scrollEl.scrollWidth <= scrollEl.clientWidth) {
                return
            }

            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                return
            }

            event.preventDefault()
            scrollEl.scrollLeft += event.deltaY
        }

        scrollEl.addEventListener('wheel', onWheel, { passive: false })

        return () => scrollEl.removeEventListener('wheel', onWheel)
    }, [boards.length])

    useEffect(() => {
        const scrollEl = scrollRef.current

        if (!scrollEl || !activeBoardId) {
            return
        }

        const activeTab = scrollEl.querySelector<HTMLElement>(`[data-board-id="${activeBoardId}"]`)

        if (!activeTab) {
            return
        }

        activeTab.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
    }, [activeBoardId, boards.length])

    const handleSelect = useCallback((boardId: string) => {
        void switchBoard(boardId)
    }, [switchBoard])

    const handleCreate = useCallback(() => {
        void createBoard()
    }, [createBoard])

    const startRename = useCallback((boardId: string, name: string) => {
        setRenamingBoardId(boardId)
        setRenameValue(name)
    }, [])

    const commitRename = useCallback(() => {
        if (!renamingBoardId) {
            return
        }

        void renameBoard(renamingBoardId, renameValue)
        setRenamingBoardId(null)
        setRenameValue('')
    }, [renameBoard, renameValue, renamingBoardId])

    const handleDelete = useCallback((boardId: string) => {
        if (boards.length <= 1) {
            return
        }

        void deleteBoard(boardId)
    }, [boards.length, deleteBoard])

    if (boards.length === 0) {
        return null
    }

    return (
        <div className={cn(styles.boardTabs, className)}>
            <div ref={scrollRef} className={styles.boardTabsScroll}>
                <div className={styles.boardTabsTrack}>
                {boards.map(board => {
                const isActive = board.id === activeBoardId

                if (renamingBoardId === board.id) {
                    return (
                        <input
                            key={board.id}
                            data-board-id={board.id}
                            className={styles.renameInput}
                            value={renameValue}
                            autoFocus
                            onChange={event => setRenameValue(event.target.value)}
                            onBlur={commitRename}
                            onKeyDown={event => {
                                if (event.key === 'Enter') {
                                    commitRename()
                                }

                                if (event.key === 'Escape') {
                                    setRenamingBoardId(null)
                                }
                            }}
                        />
                    )
                }

                return (
                    <div key={board.id} className={styles.tabGroup} data-board-id={board.id}>
                        <button
                            type="button"
                            className={isActive ? styles.tabActive : styles.tab}
                            onClick={() => handleSelect(board.id)}
                            onDoubleClick={() => startRename(board.id, board.name)}
                            title={board.name}
                        >
                            {board.name}
                        </button>
                        {boards.length > 1 && (
                            <button
                                type="button"
                                className={styles.deleteTab}
                                onClick={() => handleDelete(board.id)}
                                title="Удалить доску"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )
            })}
                    <button
                        type="button"
                        className={styles.addTab}
                        onClick={handleCreate}
                        title="Новая доска"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    )
}
