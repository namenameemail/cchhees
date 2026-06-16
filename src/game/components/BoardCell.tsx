import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameContext } from '../context'
import { Cell } from '../types/cells'
import { Mode } from '../types'
import { FigureSVGGroup } from './FigureSVGGroup'
import { CellCoord, coordsEqual, coordToIndex } from '../types/coords'
import { selectionDebugLog } from '../selectionDebugLog'
import { BoardMarkCircle } from './BoardMarkCircle'
import { ResolvedBoardMarks, isMarkLayer } from '../boardMarks'
import { BoardMarkKind } from '../types/boardMarks'
import { ARRANGE_FIGURE_DELETE_MS, ArrangeDeleteProgressRing } from './ArrangeDeleteProgressRing'

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
    hiddenFigureInstanceIds?: ReadonlySet<string>
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
        hiddenFigureInstanceIds,
    } = props

    const { i, j } = coord
    const [isHovered, setIsHovered] = useState(false)
    const [isHoldingDelete, setIsHoldingDelete] = useState(false)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const suppressClickRef = useRef(false)

    const canHoldDelete = mode === Mode.FiguresArrange && Boolean(cell.figure)

    const clearHoldDelete = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsHoldingDelete(false)
    }, [])

    useEffect(() => () => clearHoldDelete(), [clearHoldDelete])

    useEffect(() => {
        if (!cell.figure || mode !== Mode.FiguresArrange) {
            clearHoldDelete()
        }
    }, [cell.figure, mode, clearHoldDelete])

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
        clearHoldDelete()
    }, [clearHoldDelete])

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
        if (isFigureAnimating) {
            return
        }

        if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
        }

        const hasFigure = Boolean(cell.figure)
        selectionDebugLog.cellClick(coord, Mode[mode] ?? String(mode), activeCell, hasFigure)

        if (mode === Mode.FiguresArrange) {
            if (activeFigure) {
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
            } else {
                moveActiveCellFigureTo(coord)
            }
        } else if (mode === Mode.PaintTheBoard) {
            setCellParameters(coord)
        }
    }, [mode, coord, cell.figure, activeFigure, activeCell, state.boardParameters, state.cells, setActiveCell, moveActiveCellFigureTo, setCellParameters, setCellFigure, isFigureAnimating])

    const showFigure = cell.figure
        && !hiddenFigureInstanceIds?.has(cell.figure.instanceId)

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
                    {showFigure && (
                        <FigureSVGGroup
                            figureId={cell.figure!.figureId}
                            stateIndex={cell.figure!.stateIndex}
                            x={cx}
                            y={cy}
                        />
                    )}
                    {isHoldingDelete && (
                        <ArrangeDeleteProgressRing cx={cx} cy={cy} r={r} />
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
