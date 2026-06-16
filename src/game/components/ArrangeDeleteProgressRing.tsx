import React, { FC, useMemo } from 'react'
import styles from './BoardCell.module.css'

export const ARRANGE_FIGURE_DELETE_MS = 600

export interface ArrangeDeleteProgressRingProps {
    cx: number
    cy: number
    r: number
    durationMs?: number
}

export const ArrangeDeleteProgressRing: FC<ArrangeDeleteProgressRingProps> = ({
    cx,
    cy,
    r,
    durationMs = ARRANGE_FIGURE_DELETE_MS,
}) => {
    const circumference = useMemo(() => 2 * Math.PI * r, [r])
    const ringStyle = {
        '--delete-ring-circumference': `${circumference}px`,
        strokeDasharray: circumference,
        strokeDashoffset: circumference,
        animationDuration: `${durationMs}ms`,
    } as React.CSSProperties

    return (
        <>
            <circle
                className={styles.boardDeleteRingTrack}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#f0c0c0"
                strokeWidth={3}
            />
            <circle
                className={styles.boardDeleteRingProgress}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#c44"
                strokeWidth={3}
                strokeLinecap="round"
                style={ringStyle}
                transform={`rotate(-90 ${cx} ${cy})`}
            />
        </>
    )
}
