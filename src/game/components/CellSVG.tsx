import React, { CSSProperties, FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { CellParameters, CellShape } from '../types/cells'
import { CellSVGGroup } from './CellSVGGroup'

export interface CellSVGProps {
    className?: string
    cellParams: CellParameters
    onClick?: (e) => void
    onDoubleClick?: (e) => void
}


export const CellSVG: FC<CellSVGProps> = (props) => {
    const {
        mode,
        state,
        activeCell,
        activeFigure,
        setActiveCell,
        moveActiveCellFigureTo,
        setCellFigure,
        setCellParameters,
    } = useGameContext()

    const {
        boardParameters: {
            cellHeight,
            cellWidth,
            n,
            m,
            cellXDistance,
            cellYDistance,


        },
    } = state

    const {
        className,
        cellParams,
        onClick,
        onDoubleClick,
    } = props

    const doubleDistX = cellXDistance * 2
    const doubleDistY = cellYDistance * 2

    return (
        <svg
            className={className}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            width={doubleDistX}
            height={doubleDistY}
        >
            <CellSVGGroup x={doubleDistX / 2} y={doubleDistY / 2} cellParams={cellParams}/>
        </svg>
    )
}
