import React, { CSSProperties, FC, useCallback, useMemo } from 'react'
import styles from '../styles.module.css'
import { FigureSigns } from '../constants'
import { useGameContext } from '../context'
import { FigureTypes } from '../types/figures'
import { Cell, CellParameters } from '../types/cells'
import { Mode } from '../types'
import { getConditionFunctionByType } from '../context/conditions'
import { CellSVGGroup } from './CellSVGGroup'
import { CellCoord, coordsEqual } from '../types/coords'

export interface CellProps {
    cell: Cell
    coord: CellCoord
}


export const BoardCell: FC<CellProps> = (props) => {

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
        boardConditions,
    } = state

    const {
        cell,
        coord,
    } = props

    const { i, j } = coord

    const isActive = activeCell !== undefined && coordsEqual(activeCell, coord)

    const isBlack = (i + (j % 2)) % 2
    const isWhite = !isBlack
    const isDisabled = false

    const cellParams = useMemo(() => {
        return boardConditions.reduce<CellParameters>((res, { cellConditions, cellParams }) => {
            const isTrue = cellConditions?.length ? cellConditions.reduce<boolean>((res, cellCondition) => {

                return res && getConditionFunctionByType[cellCondition.type]?.(cellCondition.paramsByType?.[cellCondition.type])?.(i, j)
            }, true) : false

            return isTrue ? cellParams : res
        }, { })

    }, [boardConditions, i, j])

    const textStyle = useMemo(() => ({
        pointerEvents: 'none',
        fontSize: 26,
        textAnchor: 'middle',
        dominantBaseline: 'middle',
        alignmentBaseline: 'middle',
    }), [])
    const handlerStyle = useMemo(() => ({
        strokeDasharray: '4 1',
        fill: isActive ? 'url(#MyGradient)' : 'transparent',
        cursor: 'pointer',
        rx: cellWidth,
        ry: cellHeight,
    }), [cellWidth, cellHeight, isActive])


    const handleCellClick = useCallback(() => {
        if (mode === Mode.FiguresArrange) {

            activeFigure && setCellFigure(coord, activeFigure as FigureTypes)

        } else if (mode === Mode.Game) {
            if (activeCell === undefined) {
                setActiveCell(coord)
            } else {
                moveActiveCellFigureTo(coord)
            }
        } else if (mode === Mode.PaintTheBoard) {
            setCellParameters(coord)
        }
    }, [mode, coord, activeFigure, activeCell, setActiveCell, moveActiveCellFigureTo, setCellParameters, setCellFigure])
    return (
        <g>
            {!isDisabled && (<>
                <radialGradient id="MyGradient">
                    <stop offset="5%" stopColor="#ff00FF99"/>
                    <stop offset="95%" stopColor="#ff000000"/>
                </radialGradient>
                {cellParams && (
                    <CellSVGGroup x={i * cellXDistance+ (cellXDistance) / 2} y={j * cellYDistance + (cellYDistance) / 2} cellParams={cellParams}/>
                )}

                <circle
                    cx={i * cellXDistance + (cellXDistance) / 2}
                    cy={j * cellYDistance + (cellYDistance) / 2}
                    r={Math.min(cellXDistance, cellYDistance) / 2}

                    className={styles.cellHandler}
                    style={handlerStyle}
                    onClick={handleCellClick}
                />
                <text
                    x={i * cellXDistance + (cellXDistance) / 2}
                    y={j * cellYDistance + (cellYDistance) / 2}
                    style={textStyle as CSSProperties}

                >
                    {cell.figure ? FigureSigns[cell.figure] : undefined}
                </text>
            </>)}
        </g>
    )
}
