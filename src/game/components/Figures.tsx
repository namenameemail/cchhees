import React, { FC, useCallback } from 'react'
import { FigureSigns } from '../constants'
import { useGameContext } from '../context'
import { FigureButton } from './FigureButton'
import { FigureTypes } from '../types/figures'
import { Mode } from '../types'

export interface FiguresProps {

}


export const Figures: FC<FiguresProps> = () => {

    const { mode, setMode, activeFigure, setActiveFigure } = useGameContext()

    const handleFigureClick = useCallback((figure) => {
        if (activeFigure !== figure) {
            setMode(Mode.FiguresArrange)
            setActiveFigure(figure)
        } else {
            setMode(Mode.Game)
            setActiveFigure(undefined)
        }
    }, [setMode, activeFigure, setActiveFigure])

    return (
        <div>
            {Object.values(FigureTypes).map(figure => {
                return (
                    <FigureButton
                        type={figure}
                        onClick={handleFigureClick}
                        isActive={activeFigure === figure}
                    />
                )
            })}
        </div>
    )
}
