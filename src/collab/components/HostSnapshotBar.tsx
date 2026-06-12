import React, { FC } from 'react'
import { HostSnapshotProgress } from '../hostSnapshotProgress'
import styles from './HostSnapshotBar.module.css'

export interface HostSnapshotBarProps {
    progress: HostSnapshotProgress
}

export const HostSnapshotBar: FC<HostSnapshotBarProps> = ({ progress }) => {
    if (!progress.active || progress.phase === 'idle') {
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
                data-phase={progress.phase}
            />
        </div>
    )
}
