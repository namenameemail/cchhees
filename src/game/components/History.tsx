import React, { FC, useCallback } from 'react'
import { useGameContext } from '../context'
import styles from '../styles.module.css'

export interface HistoryProps {

}

export const History: FC<HistoryProps> = () => {
    const { undoFigures, redoFigures, figuresHistory } = useGameContext()

    const handleUndo = useCallback(() => {
        undoFigures()
    }, [undoFigures])

    const handleRedo = useCallback(() => {
        redoFigures()
    }, [redoFigures])

    return (
        <div className={styles.eaten}>
            <button type="button" onClick={handleUndo}>
                undo{figuresHistory.before.length ? ` (${figuresHistory.before.length})` : ''}
            </button>
            <button type="button" onClick={handleRedo}>
                redo{figuresHistory.after.length ? ` (${figuresHistory.after.length})` : ''}
            </button>
        </div>
    )
}
