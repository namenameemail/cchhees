import React, { FC, useCallback, useMemo } from 'react'
import styles from '../styles.module.css'
import { useGameContext } from '../context'
import { Cell } from '../types/cells'
import { Mode } from '../types'
import { FigureSVGGroup } from './FigureSVGGroup'
import { CellCoord, coordsEqual, coordToIndex } from '../types/coords'
import { selectionDebugLog } from '../selectionDebugLog'

export interface CellProps {
    cell: Cell
    coord: CellCoord
    selectionGradientId: string
    legalMoveGradientId: string
    isLegalMove: boolean
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
        selectionGradientId,
        legalMoveGradientId,
        isLegalMove,
    } = props

    const { i, j } = coord

    const isActive = activeCell !== undefined && coordsEqual(activeCell, coord)

    const isDisabled = false

    const handlerStyle = useMemo(() => ({
        strokeDasharray: '4 1',
        fill: isActive
            ? `url(#${selectionGradientId})`
            : isLegalMove
                ? `url(#${legalMoveGradientId})`
                : 'transparent',
        cursor: 'pointer',
        rx: cellWidth,
        ry: cellHeight,
    }), [cellWidth, cellHeight, isActive, isLegalMove, selectionGradientId, legalMoveGradientId])


    const handleCellClick = useCallback(() => {
        const hasFigure = Boolean(cell.figure)
        selectionDebugLog.cellClick(coord, Mode[mode] ?? String(mode), activeCell, hasFigure)

        if (mode === Mode.FiguresArrange) {

            activeFigure && setCellFigure(coord, activeFigure)

        } else if (mode === Mode.Game) {
            const { n } = state.boardParameters
            const activeCellFigure = activeCell !== undefined
                ? state.cells[coordToIndex(activeCell, n)]?.figure
                : undefined

            if (activeCell === undefined) {
                setActiveCell(coord, 'cell click · select')
            } else if (coordsEqual(activeCell, coord)) {
                setActiveCell(undefined, 'cell click · deselect')
            } else if (!activeCellFigure) {
                setActiveCell(coord, 'cell click · select after empty')
            } else {
                moveActiveCellFigureTo(coord)
            }
        } else if (mode === Mode.PaintTheBoard) {
            setCellParameters(coord)
        }
    }, [mode, coord, cell.figure, activeFigure, activeCell, state.boardParameters, state.cells, setActiveCell, moveActiveCellFigureTo, setCellParameters, setCellFigure])
    return (
        <g>
            {!isDisabled && (<>
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
                        figureId={cell.figure.figureId}
                        stateIndex={cell.figure.stateIndex}
                        x={i * cellXDistance + (cellXDistance) / 2}
                        y={j * cellYDistance + (cellYDistance) / 2}
                    />
                )}
            </>)}
        </g>
    )
}
