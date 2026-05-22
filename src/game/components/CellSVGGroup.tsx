import React, { CSSProperties, FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { CellParameters, CellShape } from '../types/cells'

export interface CellSVGGroupProps {
    cellParams: CellParameters
    x: number
    y: number
}


export const CellSVGGroup: FC<CellSVGGroupProps> = (props) => {

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
        cellParams,
        x, y,
    } = props


    const {
        shape,
        paramsByShape,


    } = cellParams || {}

    const {
        colour,
        file,
        width = 0,
        height = 0,
        strokeWidth,
        strokeColor,
        strokeDasharray,
    } = paramsByShape?.[shape as string] || {};


    const cellStyle = useMemo(() => ({
        fill: colour,
        strokeWidth,
        stroke: strokeColor,
        strokeDasharray,
        pointerEvents: 'none'
    }), [colour, strokeWidth, strokeColor, strokeDasharray])

    const doubleDistX = cellXDistance * 2
    const doubleDistY = cellYDistance * 2
    return (
        <g width={doubleDistX} height={doubleDistY}>
            {shape === CellShape.circle && (
                <ellipse
                    cx={x}
                    cy={y}
                    rx={width / 2}
                    ry={height / 2}
                    style={cellStyle as CSSProperties}
                />
            )}
            {shape === CellShape.rect && (
                <rect
                    x={x - width / 2}
                    y={y - height / 2}
                    width={width}
                    height={height}
                    style={cellStyle as CSSProperties}
                />
            )}
            {shape === CellShape.svg && (
                <image
                    xlinkHref={file}
                    width={width}
                    height={height}
                    x={x - width / 2}
                    y={y - height / 2}
                />
            )}
        </g>
    )
}
