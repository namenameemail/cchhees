import React, { FC, useCallback, useMemo } from 'react'
import styles from '../styles.module.css'
import { useGameContext } from '../context'
import { Cell } from '../types/cells'
import { Mode } from '../types'
import { FigureSVGGroup } from './FigureSVGGroup'
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
            cellXDistance,
            cellYDistance,
        },
    } = state

    const {
        cell,
        coord,
    } = props

    const { i, j } = coord

    const isActive = activeCell !== undefined && coordsEqual(activeCell, coord)

    const isDisabled = false

    const handlerStyle = useMemo(() => ({
        strokeDasharray: '4 1',
        fill: isActive ? 'url(#MyGradient)' : 'transparent',
        cursor: 'pointer',
        rx: cellWidth,
        ry: cellHeight,
    }), [cellWidth, cellHeight, isActive])


    const handleCellClick = useCallback(() => {
        if (mode === Mode.FiguresArrange) {

            activeFigure && setCellFigure(coord, activeFigure)

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

                <circle
                    data-board-handler
                    cx={i * cellXDistance + (cellXDistance) / 2}
                    cy={j * cellYDistance + (cellYDistance) / 2}
                    r={Math.min(cellXDistance, cellYDistance) / 2}

                    className={styles.cellHandler}
                    style={handlerStyle}
                    onClick={handleCellClick}
                />
                {cell.figure && (
                    <FigureSVGGroup
                        figureId={cell.figure}
                        x={i * cellXDistance + (cellXDistance) / 2}
                        y={j * cellYDistance + (cellYDistance) / 2}
                    />
                )}
            </>)}
        </g>
    )
}
