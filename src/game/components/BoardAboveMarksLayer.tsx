import React, { FC } from 'react'
import { ResolvedBoardMarks } from '../boardMarks'
import { CellCoord, coordKey, coordsEqual, iterGridCoords } from '../types/coords'
import { BoardMarkGradientIds, renderBoardMark } from './boardMarkRender'

export interface BoardAboveMarksLayerProps {
    n: number
    m: number
    cellXDistance: number
    cellYDistance: number
    boardMarks: ResolvedBoardMarks
    gradientIds: BoardMarkGradientIds
    activeCell?: CellCoord
    legalMoveKeys: ReadonlySet<string>
    hoveredCoord?: CellCoord
}

export const BoardAboveMarksLayer: FC<BoardAboveMarksLayerProps> = ({
    n,
    m,
    cellXDistance,
    cellYDistance,
    boardMarks,
    gradientIds,
    activeCell,
    legalMoveKeys,
    hoveredCoord,
}) => {
    const r = Math.min(cellXDistance, cellYDistance) / 2

    return (
        <g pointerEvents="none">
            {iterGridCoords(n, m).map((coord) => {
                const key = coordKey(coord)
                const isActive = activeCell !== undefined && coordsEqual(activeCell, coord)
                const showSelection = isActive
                const showLegalMove = legalMoveKeys.has(key) && !isActive
                const showCursor = hoveredCoord !== undefined && coordsEqual(hoveredCoord, coord)
                const cx = coord.i * cellXDistance + cellXDistance / 2
                const cy = coord.j * cellYDistance + cellYDistance / 2

                return (
                    <g key={key}>
                        {renderBoardMark('selection', boardMarks, gradientIds, 'aboveFigures', showSelection, cx, cy, r)}
                        {renderBoardMark('legalMove', boardMarks, gradientIds, 'aboveFigures', showLegalMove, cx, cy, r)}
                        {renderBoardMark('cursor', boardMarks, gradientIds, 'aboveFigures', showCursor, cx, cy, r)}
                    </g>
                )
            })}
        </g>
    )
}
