import React, { FC, RefObject, useCallback } from 'react'
import { useGameContext } from '../context'
import { BoardExportButton } from './BoardExportButton'
import styles from '../styles.module.css'

export interface BoardHistoryProps {
    boardRef: RefObject<SVGSVGElement | null>
}

export const BoardHistory: FC<BoardHistoryProps> = ({ boardRef }) => {
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
            <BoardExportButton boardRef={boardRef} />
        </div>
    )
}
