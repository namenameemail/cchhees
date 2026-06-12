import React, { FC } from 'react'
import { JoinProgress } from '../joinProgress'
import styles from './CollabJoinProgress.module.css'

export interface CollabJoinProgressProps {
    progress: JoinProgress
}

export const CollabJoinProgress: FC<CollabJoinProgressProps> = ({ progress }) => {
    if (!progress.active) {
        return null
    }

    return (
        <div className={styles.joinProgress} role="status" aria-live="polite">
            <div className={styles.joinProgressLabel}>{progress.label}</div>
            {progress.detail && (
                <div className={styles.joinProgressDetail}>{progress.detail}</div>
            )}
            <div className={styles.joinProgressTrack}>
                <div
                    className={styles.joinProgressFill}
                    style={{ width: `${progress.percent}%` }}
                />
            </div>
            <div className={styles.joinProgressPercent}>{Math.round(progress.percent)}%</div>
        </div>
    )
}
