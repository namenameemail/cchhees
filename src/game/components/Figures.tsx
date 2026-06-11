import React, { FC, useCallback } from 'react'
import { useGameContext } from '../context'
import { FigureButton } from './FigureButton'
import { FigureId } from '../types/figures'
import { Mode } from '../types'
import { FigureParametersForm } from './FigureParametersForm/FigureParametersForm'
import styles from './Figures.module.css'

export const Figures: FC = () => {
    const {
        mode,
        setMode,
        activeFigure,
        setActiveFigure,
        state,
        addFigure,
        removeFigure,
    } = useGameContext()

    const handleFigureClick = useCallback((figureId: FigureId) => {
        if (activeFigure !== figureId) {
            setMode(Mode.FiguresArrange)
            setActiveFigure(figureId)
        } else {
            setMode(Mode.Game)
            setActiveFigure(undefined)
        }
    }, [setMode, activeFigure, setActiveFigure])

    const handleAddFigure = useCallback(() => {
        addFigure()
    }, [addFigure])

    const handleRemoveFigure = useCallback(() => {
        if (!activeFigure) {
            return
        }
        removeFigure(activeFigure)
    }, [activeFigure, removeFigure])

    const canRemove = Boolean(activeFigure) && state.figureCatalog.length > 1

    return (
        <div className={styles.figuresPanel}>
            <div className={styles.figureToolbar}>
                <button type="button" onClick={handleAddFigure}>
                    add figure
                </button>
                <button
                    type="button"
                    onClick={handleRemoveFigure}
                    disabled={!canRemove}
                >
                    delete figure
                </button>
            </div>
            <div className={styles.figurePicker}>
                {state.figureCatalog.map(entry => (
                    <FigureButton
                        key={entry.id}
                        figureId={entry.id}
                        onClick={handleFigureClick}
                        isActive={activeFigure === entry.id}
                    />
                ))}
            </div>
            <FigureParametersForm />
        </div>
    )
}
