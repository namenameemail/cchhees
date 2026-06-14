import React, { FC, useCallback } from 'react'
import { useGameContext } from '../context'
import styles from '../styles.module.css'
import { FigureSVG } from './FigureSVG'

export const Tray: FC = () => {
    const { state, activeCell, setActiveCell, toTray } = useGameContext()

    const handleTrayClick = useCallback(() => {
        if (activeCell !== undefined) {
            toTray(activeCell)
            setActiveCell(undefined, 'tray drop')
        }
    }, [activeCell, toTray, setActiveCell])

    const {
        boardParameters: { cellXDistance, cellYDistance },
        tray,
    } = state

    const figureWidth = cellXDistance
    const figureHeight = cellYDistance

    return (
        <div className={styles.trayRoot}>
            <div className={styles.trayHint}>
                {tray.length === 0
                    ? 'Кликните с выбранной клеткой, чтобы убрать фигуру в лоток'
                    : `${tray.length} фиг. — клик по лотку убирает выбранную с доски`}
            </div>
            <div className={styles.eaten} onClick={handleTrayClick}>
                {tray.map((item, index) => (
                    <span
                        key={`tray-item-${index}`}
                        className={styles.trayFigure}
                        style={{
                            width: figureWidth + 8,
                            height: figureHeight + 8,
                        }}
                    >
                        <FigureSVG
                            figureId={item.figureId}
                            stateIndex={item.stateIndex}
                            width={figureWidth}
                            height={figureHeight}
                        />
                    </span>
                ))}
            </div>
        </div>
    )
}
