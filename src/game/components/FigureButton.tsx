import React, { FC, useCallback, useMemo } from 'react'
import { useGameContext } from '../context'
import { FigureId } from '../types/figures'
import { FigureSVG } from './FigureSVG'
import styles from './FigureButton.module.css'

export interface FigureButtonProps {
    figureId: FigureId
    onClick: (figureId: FigureId) => void
    isActive?: boolean
}

export const FigureButton: FC<FigureButtonProps> = ({ figureId, onClick, isActive }) => {
    const {
        state: {
            boardParameters: { cellXDistance, cellYDistance },
        },
    } = useGameContext()

    const handleClick = useCallback(() => {
        onClick(figureId)
    }, [onClick, figureId])

    const previewSize = useMemo(
        () => Math.round(Math.min(cellXDistance, cellYDistance) * 1.15),
        [cellXDistance, cellYDistance],
    )

    return (
        <button
            type="button"
            className={styles.figureButton}
            onClick={handleClick}
            title={figureId}
        >
            <FigureSVG
                figureId={figureId}
                size={previewSize}
                highlighted={isActive}
            />
        </button>
    )
}
