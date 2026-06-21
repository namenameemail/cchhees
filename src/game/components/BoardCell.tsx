import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameContext } from '../context'
import { Cell } from '../types/cells'
import { Mode } from '../types'
import { FigureSVGGroup } from './FigureSVGGroup'
import { CellCoord, coordsEqual, coordToIndex } from '../types/coords'
import { getCellStack } from '../figureStack'
import { selectionDebugLog } from '../selectionDebugLog'
import { ResolvedBoardMarks } from '../boardMarks'
import { BoardMarkGradientIds, renderBoardMark } from './boardMarkRender'
import { ARRANGE_FIGURE_DELETE_MS, ArrangeDeleteProgressRing } from './ArrangeDeleteProgressRing'

export type { BoardMarkGradientIds } from './boardMarkRender'

export interface CellProps {
    cell: Cell
    coord: CellCoord
    boardMarks: ResolvedBoardMarks
    gradientIds: BoardMarkGradientIds
    isLegalMove: boolean
    isHovered: boolean
    onHoverChange: (hovered: boolean) => void
    hiddenFigureInstanceIds?: ReadonlySet<string>
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
        isFigureAnimating,
        toTray,
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
        isHovered,
        onHoverChange,
        hiddenFigureInstanceIds,
    } = props

    const { i, j } = coord
    const [isHoldingDelete, setIsHoldingDelete] = useState(false)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const suppressClickRef = useRef(false)

    const stack = useMemo(() => getCellStack(cell), [cell])

    const topFigure = stack[stack.length - 1]
    const canHoldDelete = mode === Mode.FiguresArrange && Boolean(topFigure)

    const clearHoldDelete = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsHoldingDelete(false)
    }, [])

    useEffect(() => () => clearHoldDelete(), [clearHoldDelete])

    useEffect(() => {
        if (!topFigure || mode !== Mode.FiguresArrange) {
            clearHoldDelete()
        }
    }, [topFigure, mode, clearHoldDelete])

    const handleArrangeDeletePointerDown = useCallback((event: React.PointerEvent<SVGCircleElement>) => {
        if (!canHoldDelete) {
            return
        }

        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsHoldingDelete(true)
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            setIsHoldingDelete(false)
            suppressClickRef.current = true
            toTray(coord)
        }, ARRANGE_FIGURE_DELETE_MS)
    }, [canHoldDelete, coord, toTray])

    const handleArrangeDeletePointerEnd = useCallback(() => {
        if (isHoldingDelete || holdTimerRef.current) {
            suppressClickRef.current = true
        }
        clearHoldDelete()
    }, [clearHoldDelete, isHoldingDelete])

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
            {renderBoardMark('selection', boardMarks, gradientIds, 'belowFigures', showSelection, cx, cy, r)}
            {renderBoardMark('legalMove', boardMarks, gradientIds, 'belowFigures', showLegalMove, cx, cy, r)}
            {renderBoardMark('cursor', boardMarks, gradientIds, 'belowFigures', showCursor, cx, cy, r)}
        </>
    ), [boardMarks, gradientIds, showSelection, showLegalMove, showCursor, cx, cy, r])

    const handleCellClick = useCallback(() => {
        if (isFigureAnimating) {
            return
        }

        if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
        }

        const hasFigure = Boolean(topFigure)
        selectionDebugLog.cellClick(coord, Mode[mode] ?? String(mode), activeCell, hasFigure)

        if (mode === Mode.FiguresArrange) {
            if (activeFigure && !topFigure) {
                setCellFigure(coord, activeFigure)
            }
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
            } else if (isLegalMove) {
                moveActiveCellFigureTo(coord)
            } else {
                setActiveCell(coord, 'cell click · select')
            }
        } else if (mode === Mode.PaintTheBoard) {
            setCellParameters(coord)
        }
    }, [mode, coord, topFigure, activeFigure, activeCell, isLegalMove, state.boardParameters, state.cells, setActiveCell, moveActiveCellFigureTo, setCellParameters, setCellFigure, isFigureAnimating])

    const visibleStack = stack.filter(placement => !hiddenFigureInstanceIds?.has(placement.instanceId))
    const stackOffset = Math.min(cellXDistance, cellYDistance) * 0.08

    const handleMouseEnter = useCallback(() => {
        onHoverChange(true)
    }, [onHoverChange])

    const handleMouseLeave = useCallback(() => {
        onHoverChange(false)
    }, [onHoverChange])

    return (
        <g>
            {!isDisabled && (
                <>
                    {belowMarks}
                    {visibleStack.map((placement, index) => (
                        <FigureSVGGroup
                            key={placement.instanceId}
                            figureId={placement.figureId}
                            stateIndex={placement.stateIndex}
                            x={cx + index * stackOffset}
                            y={cy - index * stackOffset}
                        />
                    ))}
                    {isHoldingDelete && (
                        <ArrangeDeleteProgressRing cx={cx} cy={cy} r={r} />
                    )}
                    <circle
                        data-board-handler
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="transparent"
                        stroke="none"
                        style={{ cursor: 'pointer' }}
                        onClick={handleCellClick}
                        onPointerDown={canHoldDelete ? handleArrangeDeletePointerDown : undefined}
                        onPointerUp={canHoldDelete ? handleArrangeDeletePointerEnd : undefined}
                        onPointerCancel={canHoldDelete ? handleArrangeDeletePointerEnd : undefined}
                        onLostPointerCapture={canHoldDelete ? handleArrangeDeletePointerEnd : undefined}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    />
                </>
            )}
        </g>
    )
}
