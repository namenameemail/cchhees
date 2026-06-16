import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardParameters } from '../../types/boardParameters'
import { CellCoord, coordKey, coordsEqual, iterGridCoords } from '../../types/coords'
import { FigureCatalog, FigureId, FigurePlacement } from '../../types/figures'
import { FiguresSlice } from '../../state/slices'
import { cloneFigurePlacement, createFigurePlacement, resolveFigureDefinition } from '../../figureView'
import { getTopOfStack, pushToStack, removePlacementFromBoard } from '../../figureStack'
import { getLegalMoveDestinations, isFigureMoveAllowed } from '../../moveRules'
import { FigureSVGGroup } from '../FigureSVGGroup'
import { BoardFigureAnimationsLayer } from '../BoardFigureAnimationsLayer'
import { ARRANGE_FIGURE_DELETE_MS, ArrangeDeleteProgressRing } from '../ArrangeDeleteProgressRing'
import { FigureBoardAnimationState } from '../../figureAnimation/playStepAnimation'
import { getDebugBoardPixelSize } from '../../moveDebug/createDebugBoardParameters'
import styles from './MoveDebugWorkbench.module.css'

export type DebugMiniBoardMode = 'arrange' | 'game' | 'readonly'

export interface DebugMiniBoardProps {
    figuresSlice: FiguresSlice
    displayFiguresSlice?: FiguresSlice
    boardParameters: BoardParameters
    mode: DebugMiniBoardMode
    activeFigure?: FigureId
    figureCatalog: FigureCatalog
    figureBoardAnimations?: FigureBoardAnimationState
    interactionDisabled?: boolean
    onSliceChange?: (slice: FiguresSlice) => void
    onMove?: (from: CellCoord, to: CellCoord) => void
}

interface DebugMiniCellProps {
    coord: CellCoord
    stack: FigurePlacement[]
    boardParameters: BoardParameters
    mode: DebugMiniBoardMode
    activeFigure?: FigureId
    activeCell?: CellCoord
    legalMove: boolean
    hiddenFigureInstanceIds?: ReadonlySet<string>
    interactionDisabled?: boolean
    onSliceChange?: (slice: FiguresSlice) => void
    onSelectCell?: (coord: CellCoord | undefined) => void
    onMove?: (from: CellCoord, to: CellCoord) => void
    figuresSlice: FiguresSlice
}

function removeFigureAt(slice: FiguresSlice, coord: CellCoord): FiguresSlice {
    const topFigure = getTopOfStack(slice, coord)

    if (!topFigure) {
        return slice
    }

    return {
        ...removePlacementFromBoard(slice, topFigure, coord),
        tray: [cloneFigurePlacement(topFigure), ...slice.tray],
    }
}

function setFigureAt(
    slice: FiguresSlice,
    coord: CellCoord,
    figureId: FigureId,
): FiguresSlice {
    const topFigure = getTopOfStack(slice, coord)
    const next = topFigure
        ? removePlacementFromBoard(slice, topFigure, coord)
        : slice

    return {
        ...pushToStack(next, coord, createFigurePlacement(figureId)),
        tray: topFigure ? [cloneFigurePlacement(topFigure), ...slice.tray] : slice.tray,
    }
}

const DebugMiniCell: FC<DebugMiniCellProps> = ({
    coord,
    stack,
    boardParameters,
    mode,
    activeFigure,
    activeCell,
    legalMove,
    hiddenFigureInstanceIds,
    interactionDisabled,
    onSliceChange,
    onSelectCell,
    onMove,
    figuresSlice,
}) => {
    const { cellXDistance, cellYDistance } = boardParameters
    const cx = coord.i * cellXDistance + cellXDistance / 2
    const cy = coord.j * cellYDistance + cellYDistance / 2
    const r = Math.min(cellXDistance, cellYDistance) / 2 - 2

    const [isHoldingDelete, setIsHoldingDelete] = useState(false)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const suppressClickRef = useRef(false)

    const topPlacement = stack[stack.length - 1]
    const canHoldDelete = mode === 'arrange' && Boolean(topPlacement) && !interactionDisabled

    const clearHoldDelete = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsHoldingDelete(false)
    }, [])

    useEffect(() => () => clearHoldDelete(), [clearHoldDelete])

    useEffect(() => {
        if (!topPlacement || mode !== 'arrange') {
            clearHoldDelete()
        }
    }, [topPlacement, mode, clearHoldDelete])

    const handleArrangeDeletePointerDown = useCallback((event: React.PointerEvent<SVGCircleElement>) => {
        if (!canHoldDelete || !onSliceChange) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsHoldingDelete(true)
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            setIsHoldingDelete(false)
            suppressClickRef.current = true
            onSliceChange(removeFigureAt(figuresSlice, coord))
        }, ARRANGE_FIGURE_DELETE_MS)
    }, [canHoldDelete, coord, figuresSlice, onSliceChange])

    const handleArrangeDeletePointerEnd = useCallback(() => {
        clearHoldDelete()
    }, [clearHoldDelete])

    const handleClick = useCallback(() => {
        if (interactionDisabled) {
            return
        }

        if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
        }

        if (mode === 'arrange') {
            if (!onSliceChange || !activeFigure) {
                return
            }

            onSliceChange(setFigureAt(figuresSlice, coord, activeFigure))
            return
        }

        if (mode === 'game') {
            if (!onSelectCell || !onMove) {
                return
            }

            const hasFigure = Boolean(topPlacement)

            if (activeCell === undefined) {
                if (hasFigure) {
                    onSelectCell(coord)
                }
                return
            }

            if (coordsEqual(activeCell, coord)) {
                onSelectCell(undefined)
                return
            }

            const fromPlacement = getTopOfStack(figuresSlice, activeCell)

            if (!fromPlacement) {
                onSelectCell(hasFigure ? coord : undefined)
                return
            }

            onMove(activeCell, coord)
            onSelectCell(undefined)
        }
    }, [
        interactionDisabled,
        mode,
        onSliceChange,
        activeFigure,
        figuresSlice,
        coord,
        onSelectCell,
        onMove,
        activeCell,
        topPlacement,
    ])

    const visibleStack = stack.filter(placement => !hiddenFigureInstanceIds?.has(placement.instanceId))
    const stackOffset = Math.min(cellXDistance, cellYDistance) * 0.08
    const isActive = activeCell !== undefined && coordsEqual(activeCell, coord)
    const interactive = mode !== 'readonly' && !interactionDisabled

    return (
        <g>
            <rect
                x={coord.i * cellXDistance + 1}
                y={coord.j * cellYDistance + 1}
                width={cellXDistance - 2}
                height={cellYDistance - 2}
                fill={isActive ? '#0088ff22' : legalMove ? '#00aa4422' : '#ffffffcc'}
                stroke={isActive ? '#0088ff' : legalMove ? '#00aa44' : '#cccccc'}
                strokeWidth={1}
            />
            {visibleStack.map((placement, index) => (
                <FigureSVGGroup
                    key={placement.instanceId}
                    figureId={placement.figureId}
                    stateIndex={placement.stateIndex}
                    x={cx + index * stackOffset}
                    y={cy - index * stackOffset}
                    cellXDistance={cellXDistance}
                    cellYDistance={cellYDistance}
                />
            ))}
            {isHoldingDelete && (
                <ArrangeDeleteProgressRing cx={cx} cy={cy} r={r} />
            )}
            {interactive && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="transparent"
                    stroke="none"
                    style={{ cursor: 'pointer' }}
                    onClick={handleClick}
                    onPointerDown={canHoldDelete ? handleArrangeDeletePointerDown : undefined}
                    onPointerUp={canHoldDelete ? handleArrangeDeletePointerEnd : undefined}
                    onPointerCancel={canHoldDelete ? handleArrangeDeletePointerEnd : undefined}
                    onLostPointerCapture={canHoldDelete ? handleArrangeDeletePointerEnd : undefined}
                />
            )}
        </g>
    )
}

export const DebugMiniBoard: FC<DebugMiniBoardProps> = ({
    figuresSlice,
    displayFiguresSlice,
    boardParameters,
    mode,
    activeFigure,
    figureCatalog,
    figureBoardAnimations,
    interactionDisabled,
    onSliceChange,
    onMove,
}) => {
    const [activeCell, setActiveCell] = useState<CellCoord | undefined>(undefined)
    const renderedSlice = displayFiguresSlice ?? figuresSlice
    const { n, m } = boardParameters
    const pixelSize = getDebugBoardPixelSize(boardParameters)

    useEffect(() => {
        if (mode !== 'game') {
            setActiveCell(undefined)
        }
    }, [mode])

    const legalMoveKeys = useMemo(() => {
        if (mode !== 'game' || activeCell === undefined) {
            return new Set<string>()
        }

        const placement = getTopOfStack(renderedSlice, activeCell)

        if (!placement) {
            return new Set<string>()
        }

        const definition = resolveFigureDefinition(placement.figureId, figureCatalog)

        return new Set(
            getLegalMoveDestinations(
                activeCell,
                definition,
                renderedSlice.figuresByCoord,
                boardParameters,
                placement,
            ).map(coordKey),
        )
    }, [mode, activeCell, renderedSlice, figureCatalog, boardParameters])

    const handleSliceChange = useCallback((nextSlice: FiguresSlice) => {
        onSliceChange?.(nextSlice)
    }, [onSliceChange])

    const handleMove = useCallback((from: CellCoord, to: CellCoord) => {
        if (interactionDisabled) {
            return
        }

        const fromPlacement = getTopOfStack(figuresSlice, from)

        if (!fromPlacement) {
            return
        }

        const definition = resolveFigureDefinition(fromPlacement.figureId, figureCatalog)

        if (!isFigureMoveAllowed(
            from,
            to,
            definition,
            figuresSlice.figuresByCoord,
            boardParameters,
            fromPlacement,
        )) {
            return
        }

        onMove?.(from, to)
    }, [interactionDisabled, figuresSlice, figureCatalog, boardParameters, onMove])

    return (
        <svg
            className={styles.miniBoardSvg}
            width={pixelSize.width}
            height={pixelSize.height}
            viewBox={`0 0 ${pixelSize.width} ${pixelSize.height}`}
        >
            <rect
                width={pixelSize.width}
                height={pixelSize.height}
                fill="#f4f4f4"
            />
            {iterGridCoords(n, m).map((coord) => {
                const key = coordKey(coord)

                return (
                    <DebugMiniCell
                        key={key}
                        coord={coord}
                        stack={renderedSlice.figuresByCoord[key] ?? []}
                        boardParameters={boardParameters}
                        mode={mode}
                        activeFigure={activeFigure}
                        activeCell={activeCell}
                        legalMove={legalMoveKeys.has(key)}
                        hiddenFigureInstanceIds={figureBoardAnimations?.hiddenInstanceIds}
                        interactionDisabled={interactionDisabled}
                        onSliceChange={handleSliceChange}
                        onSelectCell={setActiveCell}
                        onMove={handleMove}
                        figuresSlice={figuresSlice}
                    />
                )
            })}
            {figureBoardAnimations && (
                <BoardFigureAnimationsLayer
                    items={figureBoardAnimations.overlayItems}
                    cellXDistance={boardParameters.cellXDistance}
                    cellYDistance={boardParameters.cellYDistance}
                />
            )}
        </svg>
    )
}
