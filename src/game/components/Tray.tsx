import React, { FC, useCallback } from 'react'
import { useGameContext } from '../context'
import styles from '../styles.module.css'
import { FigureSVG } from './FigureSVG'

export const Tray: FC = () => {
    const { state, activeCell, setActiveCell, toTray } = useGameContext()

    const handleTrayClick = useCallback(() => {
        if (activeCell !== undefined) {
            toTray(activeCell)
            setActiveCell(undefined)
        }
    }, [activeCell, toTray, setActiveCell])

    const {
        boardParameters: { cellXDistance, cellYDistance },
    } = state

    const previewSize = Math.max(24, Math.min(cellXDistance, cellYDistance) * 0.5)

    return (
        <div className={styles.eaten} onClick={handleTrayClick}>
            {state.tray.map((item, index) => (
                <span
                    key={`${item}-${index}`}
                    className={styles.trayFigure}
                >
                    <FigureSVG figureId={item} size={previewSize} />
                </span>
            ))}
        </div>
    )
}
