import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { HiddenScroll } from 'bbuutoonnss'
import { useProjectContext } from '../../projects/ProjectContext'
import styles from './BoardTabs.module.css'

const DELETE_HOLD_MS = 1000

export interface BoardTabsProps {
    className?: string
}

interface BoardTabGroupProps {
    boardId: string
    boardName: string
    isActive: boolean
    showDelete: boolean
    isRenaming: boolean
    renameValue: string
    renameWidth: number | null
    onSelect: (boardId: string) => void
    onStartRename: (boardId: string, boardName: string, width: number) => void
    onRenameChange: (value: string) => void
    onRenameCommit: () => void
    onRenameCancel: () => void
    onDuplicate: (boardId: string) => void
    onDelete: (boardId: string) => void
}

function BoardTabGroup({
    boardId,
    boardName,
    isActive,
    showDelete,
    isRenaming,
    renameValue,
    renameWidth,
    onSelect,
    onStartRename,
    onRenameChange,
    onRenameCommit,
    onRenameCancel,
    onDuplicate,
    onDelete,
}: BoardTabGroupProps) {
    const [isHoldingDelete, setIsHoldingDelete] = useState(false)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const renameInputRef = useRef<HTMLInputElement>(null)

    const clearHold = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsHoldingDelete(false)
    }, [])

    const handleDeletePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsHoldingDelete(true)
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            setIsHoldingDelete(false)
            onDelete(boardId)
        }, DELETE_HOLD_MS)
    }, [boardId, onDelete])

    const handleDeletePointerEnd = useCallback(() => {
        clearHold()
    }, [clearHold])

    useEffect(() => () => clearHold(), [clearHold])

    useEffect(() => {
        if (!isRenaming) {
            return
        }

        renameInputRef.current?.focus()
        renameInputRef.current?.select()
    }, [isRenaming])

    const handleMiddleClick = useCallback((event: React.MouseEvent) => {
        if (event.button !== 1 || isRenaming) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        onDuplicate(boardId)
    }, [boardId, isRenaming, onDuplicate])

    const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        onStartRename(boardId, boardName, event.currentTarget.offsetWidth)
    }, [boardId, boardName, onStartRename])

    const tabClassName = isActive ? styles.tabActive : styles.tab

    return (
        <div
            className={cn(styles.tabGroup, isHoldingDelete && styles.tabGroupHoldDeleting)}
            data-board-id={boardId}
        >
            <div
                className={styles.tabShell}
                style={isRenaming && renameWidth ? { width: renameWidth } : undefined}
            >
                {isRenaming ? (
                    <input
                        ref={renameInputRef}
                        type="text"
                        className={cn(tabClassName, styles.tabRename)}
                        value={renameValue}
                        aria-label="Имя доски"
                        onChange={event => onRenameChange(event.target.value)}
                        onBlur={onRenameCommit}
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                onRenameCommit()
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault()
                                onRenameCancel()
                            }
                        }}
                        onClick={event => event.stopPropagation()}
                        onDoubleClick={event => event.stopPropagation()}
                    />
                ) : (
                    <button
                        type="button"
                        className={tabClassName}
                        onClick={() => onSelect(boardId)}
                        onDoubleClick={handleDoubleClick}
                        onMouseDown={handleMiddleClick}
                        onAuxClick={handleMiddleClick}
                        title={`${boardName} (двойной клик — переименовать, колесико — дублировать)`}
                    >
                        {boardName}
                    </button>
                )}
            </div>
            {showDelete && (
                <button
                    type="button"
                    className={cn(styles.deleteTab, isRenaming && styles.deleteTabHidden)}
                    aria-hidden={isRenaming}
                    tabIndex={isRenaming ? -1 : undefined}
                    aria-label={`Удалить доску ${boardName}`}
                    title="Удерживайте для удаления"
                    onPointerDown={handleDeletePointerDown}
                    onPointerUp={handleDeletePointerEnd}
                    onPointerCancel={handleDeletePointerEnd}
                    onLostPointerCapture={handleDeletePointerEnd}
                >
                    ×
                </button>
            )}
        </div>
    )
}

export const BoardTabs: FC<BoardTabsProps> = ({ className }) => {
    const {
        boards,
        activeBoardId,
        switchBoard,
        createBoard,
        renameBoard,
        deleteBoard,
        duplicateBoard,
    } = useProjectContext()

    const scrollRef = useRef<HTMLDivElement>(null)
    const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [renameWidth, setRenameWidth] = useState<number | null>(null)

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

    const startRename = useCallback((boardId: string, name: string, width: number) => {
        setRenamingBoardId(boardId)
        setRenameValue(name)
        setRenameWidth(width)
    }, [])

    const cancelRename = useCallback(() => {
        setRenamingBoardId(null)
        setRenameValue('')
        setRenameWidth(null)
    }, [])

    const commitRename = useCallback(() => {
        if (!renamingBoardId) {
            return
        }

        void renameBoard(renamingBoardId, renameValue)
        cancelRename()
    }, [cancelRename, renameBoard, renameValue, renamingBoardId])

    const handleDuplicate = useCallback((boardId: string) => {
        void duplicateBoard(boardId)
    }, [duplicateBoard])

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
            <HiddenScroll
                ref={scrollRef}
                direction="horizontal"
                className={styles.boardTabsScroll}
                trackClassName={styles.boardTabsTrack}
            >
                {boards.map(board => (
                    <BoardTabGroup
                        key={board.id}
                        boardId={board.id}
                        boardName={board.name}
                        isActive={board.id === activeBoardId}
                        showDelete={boards.length > 1}
                        isRenaming={renamingBoardId === board.id}
                        renameValue={renameValue}
                        renameWidth={renamingBoardId === board.id ? renameWidth : null}
                        onSelect={handleSelect}
                        onStartRename={startRename}
                        onRenameChange={setRenameValue}
                        onRenameCommit={commitRename}
                        onRenameCancel={cancelRename}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                    />
                ))}
                <button
                    type="button"
                    className={styles.addTab}
                    onClick={handleCreate}
                    title="Новая доска"
                >
                    +
                </button>
            </HiddenScroll>
        </div>
    )
}
