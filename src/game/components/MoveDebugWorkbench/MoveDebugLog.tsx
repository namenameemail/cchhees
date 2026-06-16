import React, { FC } from 'react'
import cn from 'classnames'
import {
    FigureBoardCompareResult,
    formatFigureBoardMismatch,
} from '../../moveDebug/compareFigureBoards'
import { MoveDebugLogEntry } from '../../moveDebug/moveDebugSessionLog'
import styles from './MoveDebugWorkbench.module.css'

export interface MoveDebugLogProps {
    entries: MoveDebugLogEntry[]
    compareResult: FigureBoardCompareResult | null
}

function formatLogDetail(detail: unknown): string | null {
    if (detail === undefined) {
        return null
    }

    try {
        return JSON.stringify(detail, null, 2)
    } catch {
        return String(detail)
    }
}

export const MoveDebugLog: FC<MoveDebugLogProps> = ({ entries, compareResult }) => {
    return (
        <div className={styles.logSection}>
            <h3 className={styles.logTitle}>Log</h3>
            <div className={styles.logScroll}>
                {entries.length === 0 && (
                    <p className={styles.logEntry}>No entries yet.</p>
                )}
                {entries.map(entry => {
                    const detail = formatLogDetail(entry.detail)

                    return (
                        <p
                            key={entry.id}
                            className={cn(
                                styles.logEntry,
                                entry.level === 'snapshot' && styles.logEntrySnapshot,
                                entry.level === 'profiler' && styles.logEntryProfiler,
                                entry.level === 'chain' && styles.logEntryChain,
                                entry.level === 'save' && styles.logEntrySave,
                                entry.level === 'compare' && (
                                    entry.message.startsWith('✓')
                                        ? styles.logEntryCompare
                                        : styles.logEntryCompareFail
                                ),
                            )}
                        >
                            [{entry.time}] {entry.message}
                            {detail && (
                                <pre className={styles.logDetail}>{detail}</pre>
                            )}
                        </p>
                    )
                })}
            </div>

            {compareResult && (
                <div className={styles.compareBlock}>
                    {compareResult.match ? (
                        <span className={styles.compareMatch}>✓ Boards match</span>
                    ) : (
                        <>
                            <span className={styles.compareMismatch}>✗ Mismatch</span>
                            <ul className={styles.mismatchList}>
                                {compareResult.mismatches.map(mismatch => (
                                    <li key={`${mismatch.kind}-${mismatch.coord}`} className={styles.mismatchItem}>
                                        {formatFigureBoardMismatch(mismatch)}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
