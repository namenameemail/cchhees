import React, { CSSProperties, FC, useCallback, useMemo } from 'react'
import styles from '../styles.module.css'
import cn from 'classnames'
import { FigureSigns } from '../constants'
import { useGameContext } from '../context'
import { indexToIJ } from '../utils'
import { FigureTypes } from '../types/figures'
import { Cell, CellParameters, CellShape } from '../types/cells'
import { Mode } from '../types'
import { CellSVG } from './CellSVG'
import { getConditionFunctionByType } from '../context/conditions'
import { CellSVGGroup } from './CellSVGGroup'

export interface CellProps {
    cell: Cell
    index: number
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
        cells,
    } = state

    const {
        cell,
        index,
    } = props

    const { i, j } = indexToIJ(index, n)

    const isActive = index === activeCell

    // const {
    //     parameters: cellParams,
    // } = cell

    const isBlack = (i + (j % 2)) % 2
    const isWhite = !isBlack
    const isDisabled = false;//((isWhite && disableWhite) || (isBlack && disableBlack))

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
        // stroke: 'black',
        fill: isActive ? 'url(#MyGradient)' : 'transparent',
        cursor: 'pointer',
        rx: cellWidth,
        ry: cellHeight,
    }), [cellWidth, cellHeight, isActive])


    const handleCellClick = useCallback(() => {
        console.log(mode)
        if (mode === Mode.FiguresArrange) {

            activeFigure && setCellFigure(index, activeFigure as FigureTypes)

        } else if (mode === Mode.Game) {
            if (activeCell === undefined) {
                setActiveCell(index)
            } else {
                moveActiveCellFigureTo(index)
            }
        } else if (mode === Mode.PaintTheBoard) {
            console.log('ok')
            setCellParameters(index)
        }
    }, [mode, index, activeFigure, activeCell, setActiveCell, moveActiveCellFigureTo, setCellParameters])
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
