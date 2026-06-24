import React, { FC, useCallback, useState } from 'react'
import cn from 'classnames'
import { useGameContext } from '../context'
import { hasMoveRecData } from '../moveDebug/moveRecLog'
import styles from './MoveRecControls.module.css'

export const MoveRecControls: FC = () => {
    const {
        moveRecActive,
        moveRecMoveCount,
        toggleMoveRec,
        saveMoveRec,
    } = useGameContext()
    const [saveStatus, setSaveStatus] = useState<string | null>(null)

    const handleSave = useCallback(async () => {
        const result = await saveMoveRec()

        if (result.ok) {
            setSaveStatus('saved')
        } else {
            setSaveStatus(result.error ?? 'failed')
        }

        window.setTimeout(() => setSaveStatus(null), 2000)
    }, [saveMoveRec])

    const canSave = hasMoveRecData()

    return (
        <div className={styles.root}>
            <button
                type="button"
                className={cn(styles.recButton, moveRecActive && styles.recButtonActive)}
                onClick={toggleMoveRec}
                title={moveRecActive ? 'Stop recording moves' : 'Record moves on project board'}
            >
                Rec
            </button>
            <button
                type="button"
                className={styles.saveButton}
                disabled={!canSave}
                onClick={() => { void handleSave() }}
                title="Save to profiling/move_rec.json"
            >
                Save
            </button>
            {(moveRecActive || moveRecMoveCount > 0) && (
                <span className={styles.counter} title="Recorded moves">
                    ● {moveRecMoveCount}
                </span>
            )}
            {saveStatus && (
                <span className={styles.saveStatus}>{saveStatus}</span>
            )}
        </div>
    )
}
