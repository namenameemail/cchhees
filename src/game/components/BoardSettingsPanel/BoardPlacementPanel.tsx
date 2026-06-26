import React, { FC, useCallback, useMemo } from 'react'
import { useGameContext } from '../../context'
import { cloneFiguresSlice } from '../../state/reconcile'
import { useProjectContext } from '../../../projects/ProjectContext'
import {
    compareFiguresSlices,
    countFiguresOnBoard,
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

    const defaultCounts = useMemo(
        () => (defaultFigures ? countFiguresOnBoard(defaultFigures) : { onBoard: 0, inTray: 0 }),
        [defaultFigures],
    )

    const matchesDefault = useMemo(() => {
        if (!defaultFigures) {
            return false
        }

        return compareFiguresSlices(figuresSlice, defaultFigures)
    }, [figuresSlice, defaultFigures])

    const defaultStatusLabel = useMemo(() => {
        if (!activeBoard?.defaultFigures) {
            return 'Дефолт: пустая доска'
        }

        const { onBoard, inTray } = defaultCounts

        if (inTray > 0) {
            return `Дефолт: ${onBoard} на доске, ${inTray} в трее`
        }

        return `Дефолт: ${onBoard} на доске`
    }, [activeBoard?.defaultFigures, defaultCounts])

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
            <p className={styles.placementHint}>{defaultStatusLabel}</p>
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
            <p className={styles.placementHint}>
                Сброс очищает undo фигур на этой доске.
            </p>
        </div>
    )
}
