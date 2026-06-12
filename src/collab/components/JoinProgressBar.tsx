import React, { FC } from 'react'
import { JoinProgress } from '../joinProgress'
import styles from './HostSnapshotBar.module.css'

export interface JoinProgressBarProps {
    progress: JoinProgress
}

export const JoinProgressBar: FC<JoinProgressBarProps> = ({ progress }) => {
    if (!progress.active) {
        return null
    }

    return (
        <div
            className={styles.barShell}
            role="status"
            aria-live="polite"
            title={[progress.label, progress.detail].filter(Boolean).join(' — ')}
        >
            <div
                className={styles.barFill}
                style={{ width: `${progress.percent}%` }}
            />
        </div>
    )
}
