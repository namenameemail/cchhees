import React, { CSSProperties, FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { CellParameters, CellShape } from '../types/cells'
import { CellSVGGroup } from './CellSVGGroup'
import { ConnectionParams } from '../types/connections'
import { ConnectionSVGGroup } from './ConnectionSVGGroup'

export interface ConnectionSVGProps {
    className?: string
    connectionParams: ConnectionParams
    onClick?: (e) => void
    onDoubleClick?: (e) => void
}


export const ConnectionSVG: FC<ConnectionSVGProps> = (props) => {
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
        connectionParams,
        onClick,
        onDoubleClick,
    } = props

    const doubleDistX = cellXDistance * 2
    const doubleDistY = cellYDistance * 2

    return (
        <svg className={className} onClick={onClick} onDoubleClick={onDoubleClick} width={doubleDistX} height={doubleDistY} viewBox={`0 0 ${doubleDistX} ${doubleDistY}`}>
            <ConnectionSVGGroup connectionParams={connectionParams}/>
        </svg>
    )
}
