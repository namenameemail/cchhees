import React, { FC, useCallback, useMemo } from 'react'
import { useGameContext } from '../../context'
import { cloneFiguresSlice } from '../../state/reconcile'
import { useProjectContext } from '../../../projects/ProjectContext'
import {
    compareFiguresSlices,
    getBoardDefaultFigures,
} from '../../../projects/boardDefaultFigures'
import { PlacementThumbnail } from '../PlacementThumbnail'
import styles from './styles.module.css'

export const BoardPlacementPanel: FC = () => {
    const { figuresSlice, restoreDefaultFigures } = useGameContext()
    const {
        boards,
        activeBoardId,
        setActiveBoardDefaultFigures,
    } = useProjectContext()

    const activeBoard = useMemo(
        () => boards.find(board => board.id === activeBoardId),
        [boards, activeBoardId],
    )

    const defaultFigures = useMemo(
        () => (activeBoard ? getBoardDefaultFigures(activeBoard) : null),
        [activeBoard],
    )

    const matchesDefault = useMemo(() => {
        if (!defaultFigures) {
            return false
        }

        return compareFiguresSlices(figuresSlice, defaultFigures)
    }, [figuresSlice, defaultFigures])

    const handleSaveDefault = useCallback(() => {
        void setActiveBoardDefaultFigures(cloneFiguresSlice(figuresSlice))
    }, [figuresSlice, setActiveBoardDefaultFigures])

    const handleRestoreDefault = useCallback(() => {
        if (!defaultFigures) {
            return
        }

        restoreDefaultFigures(defaultFigures)
    }, [defaultFigures, restoreDefaultFigures])

    return (
        <div className={styles.placementPanel}>
            {defaultFigures && (
                <div className={styles.thumbnailContainer}>
                    <PlacementThumbnail figuresSlice={defaultFigures} />
                </div>
            )}
            <div className={styles.placementActions}>
                <button
                    type="button"
                    className={styles.placementButton}
                    onClick={handleSaveDefault}
                >
                    Сохранить текущую расстановку
                </button>
                <button
                    type="button"
                    className={styles.placementButton}
                    disabled={!activeBoard || matchesDefault}
                    onClick={handleRestoreDefault}
                >
                    Сбросить к расстановке
                </button>
            </div>
        </div>
    )
}
