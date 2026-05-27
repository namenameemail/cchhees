import React, { FC, useCallback } from 'react'
import { useGameContext } from '../context'
import styles from '../styles.module.css'

export interface BoardHistoryProps {

}

export const BoardHistory: FC<BoardHistoryProps> = () => {
    const { undoBoard, redoBoard, boardHistory } = useGameContext()

    const handleUndo = useCallback(() => {
        undoBoard()
    }, [undoBoard])

    const handleRedo = useCallback(() => {
        redoBoard()
    }, [redoBoard])

    return (
        <div className={styles.boardHistory}>
            <button type="button" onClick={handleUndo}>
                undo{boardHistory.before.length ? ` (${boardHistory.before.length})` : ''}
            </button>
            <button type="button" onClick={handleRedo}>
                redo{boardHistory.after.length ? ` (${boardHistory.after.length})` : ''}
            </button>
        </div>
    )
}
