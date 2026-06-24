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
    const {
        undoBoard,
        redoBoard,
        boardHistory,
        undoFigures,
        redoFigures,
        figuresHistory,
    } = useGameContext()

    if (!slot) {
        return null
    }

    return createPortal(
        <div className={styles.root}>
            {import.meta.env.DEV && <MoveRecControls />}
            <div className={styles.historyGroup}>
                <button
                    type="button"
                    className={styles.historyButton}
                    onClick={undoFigures}
                    disabled={figuresHistory.before.length === 0}
                    title={`Отменить ход${figuresHistory.before.length ? ` (${figuresHistory.before.length})` : ''}`}
                    aria-label="Отменить ход"
                >
                    ↶
                </button>
                <button
                    type="button"
                    className={styles.historyButton}
                    onClick={redoFigures}
                    disabled={figuresHistory.after.length === 0}
                    title={`Повторить ход${figuresHistory.after.length ? ` (${figuresHistory.after.length})` : ''}`}
                    aria-label="Повторить ход"
                >
                    ↷
                </button>
            </div>
            <div className={styles.historyGroup}>
                <button
                    type="button"
                    className={styles.historyButton}
                    onClick={undoBoard}
                    disabled={boardHistory.before.length === 0}
                    title={`Отменить правку доски${boardHistory.before.length ? ` (${boardHistory.before.length})` : ''}`}
                >
                    undo
                </button>
                <button
                    type="button"
                    className={styles.historyButton}
                    onClick={redoBoard}
                    disabled={boardHistory.after.length === 0}
                    title={`Повторить правку доски${boardHistory.after.length ? ` (${boardHistory.after.length})` : ''}`}
                >
                    redo
                </button>
            </div>
            <BoardExportButton boardRef={boardRef} iconMode />
        </div>,
        slot,
    )
}
