import React, { FC, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useGameContext } from '../context'
import { BoardExportButton } from './BoardExportButton'
import { MoveRecControls } from './MoveRecControls'
import styles from './BoardTopBarActions.module.css'

export const TOP_BAR_BOARD_ACTIONS_SLOT_ID = 'top-bar-board-actions'

export interface BoardTopBarActionsProps {
    boardRef: RefObject<SVGSVGElement | null>
}

export const BoardTopBarActions: FC<BoardTopBarActionsProps> = ({ boardRef }) => {
    const slot = document.getElementById(TOP_BAR_BOARD_ACTIONS_SLOT_ID)
    const { undoBoard, redoBoard, boardHistory } = useGameContext()

    if (!slot) {
        return null
    }

    return createPortal(
        <div className={styles.root}>
            {import.meta.env.DEV && <MoveRecControls />}
            <button
                type="button"
                onClick={undoBoard}
                disabled={boardHistory.before.length === 0}
                title={`undo${boardHistory.before.length ? ` (${boardHistory.before.length})` : ''}`}
            >
                undo
            </button>
            <button
                type="button"
                onClick={redoBoard}
                disabled={boardHistory.after.length === 0}
                title={`redo${boardHistory.after.length ? ` (${boardHistory.after.length})` : ''}`}
            >
                redo
            </button>
            <BoardExportButton boardRef={boardRef} iconMode />
        </div>,
        slot,
    )
}
