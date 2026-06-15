import React, { FC, useCallback, useMemo, useState } from 'react'
import { useGameContext } from '../context'
import { Cell } from '../types/cells'
import { Mode } from '../types'
import { FigureSVGGroup } from './FigureSVGGroup'
import { CellCoord, coordsEqual, coordToIndex } from '../types/coords'
import { selectionDebugLog } from '../selectionDebugLog'
import { BoardMarkCircle } from './BoardMarkCircle'
import { ResolvedBoardMarks, isMarkLayer } from '../boardMarks'
import { BoardMarkKind } from '../types/boardMarks'

export interface BoardMarkGradientIds {
    selection?: string
    selectionOverlay?: string
    legalMove?: string
    legalMoveOverlay?: string
    cursor?: string
    cursorOverlay?: string
}

export interface CellProps {
    cell: Cell
    coord: CellCoord
    boardMarks: ResolvedBoardMarks
    gradientIds: BoardMarkGradientIds
    isLegalMove: boolean
}

function renderMark(
    kind: BoardMarkKind,
    boardMarks: ResolvedBoardMarks,
    gradientIds: BoardMarkGradientIds,
    layer: 'belowFigures' | 'aboveFigures',
    visible: boolean,
    cx: number,
    cy: number,
    r: number,
) {
    const appearance = boardMarks[kind]

    if (!isMarkLayer(appearance, layer) || !visible) {
        return null
    }

    return (
        <BoardMarkCircle
            key={kind}
            kind={kind}
            appearance={appearance}
            gradientId={gradientIds[kind]}
            overlayGradientId={gradientIds[`${kind}Overlay` as keyof BoardMarkGradientIds]}
            cx={cx}
            cy={cy}
            r={r}
            visible
        />
    )
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
            cellXDistance,
            cellYDistance,
        },
    } = state

    const {
        cell,
        coord,
        boardMarks,
        gradientIds,
        isLegalMove,
    } = props

    const { i, j } = coord
    const [isHovered, setIsHovered] = useState(false)

    const isActive = activeCell !== undefined && coordsEqual(activeCell, coord)
    const isDisabled = false

    const cx = i * cellXDistance + cellXDistance / 2
    const cy = j * cellYDistance + cellYDistance / 2
    const r = Math.min(cellXDistance, cellYDistance) / 2

    const showSelection = isActive
    const showLegalMove = isLegalMove && !isActive
    const showCursor = isHovered

    const belowMarks = useMemo(() => (
        <>
            {renderMark('selection', boardMarks, gradientIds, 'belowFigures', showSelection, cx, cy, r)}
            {renderMark('legalMove', boardMarks, gradientIds, 'belowFigures', showLegalMove, cx, cy, r)}
            {renderMark('cursor', boardMarks, gradientIds, 'belowFigures', showCursor, cx, cy, r)}
        </>
    ), [boardMarks, gradientIds, showSelection, showLegalMove, showCursor, cx, cy, r])

    const aboveMarks = useMemo(() => (
        <>
            {renderMark('selection', boardMarks, gradientIds, 'aboveFigures', showSelection, cx, cy, r)}
            {renderMark('legalMove', boardMarks, gradientIds, 'aboveFigures', showLegalMove, cx, cy, r)}
            {renderMark('cursor', boardMarks, gradientIds, 'aboveFigures', showCursor, cx, cy, r)}
        </>
    ), [boardMarks, gradientIds, showSelection, showLegalMove, showCursor, cx, cy, r])

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

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true)
    }, [])

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false)
    }, [])

    return (
        <g>
            {!isDisabled && (
                <>
                    {belowMarks}
                    {cell.figure && (
                        <FigureSVGGroup
                            figureId={cell.figure.figureId}
                            stateIndex={cell.figure.stateIndex}
                            x={cx}
                            y={cy}
                        />
                    )}
                    {aboveMarks}
                    <circle
                        data-board-handler
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="transparent"
                        stroke="none"
                        style={{ cursor: 'pointer' }}
                        onClick={handleCellClick}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    />
                </>
            )}
        </g>
    )
}
