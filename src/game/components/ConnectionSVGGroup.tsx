import React, { CSSProperties, FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { CellParameters, CellShape } from '../types/cells'
import { ConnectionParams } from '../types/connections'

export interface ConnectionSVGGroupProps {
    connectionParams: ConnectionParams
    x1?: number
    y1?: number
    x2?: number
    y2?: number
}


export const ConnectionSVGGroup: FC<ConnectionSVGGroupProps> = (props) => {

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


    const doubleDistX = cellXDistance * 2
    const doubleDistY = cellYDistance * 2

    const {
        connectionParams,
        x1 = doubleDistX / 4, y1 = doubleDistY / 4,
        x2 = doubleDistX * 3 / 4, y2 = doubleDistY * 3 / 4,
    } = props


    const {

        strokeWidth,
        strokeColor,
        strokeDasharray,
        strokeLinecap,
    } = connectionParams || {}

    const connectionStyle = useMemo(() => ({
        strokeWidth,
        stroke: strokeColor,
        strokeDasharray,
        strokeLinecap,
        pointerEvents: 'none',
    }), [strokeWidth, strokeColor, strokeDasharray, strokeLinecap])

    return (
        <g width={doubleDistX} height={doubleDistY}>
            <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                style={connectionStyle as CSSProperties}
            />
        </g>
    )
}
