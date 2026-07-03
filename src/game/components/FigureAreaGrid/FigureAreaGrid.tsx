import React, { FC, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
    DragEvent,
    DragHandler,
    getNumberDragDelta,
    NumberDragDirection,
    scaleNumberDragDelta,
} from 'bbuutoonnss'
import { FigureId, FigureMoveDirection } from '../../types/figures'
import { FigureEventAreaCell } from '../../types/events'
import { FigureSVG } from '../FigureSVG'
import {
    AREA_GRID_AREA_SIZE,
    AreaGridBounds,
    clampAreaGridBounds,
    getCellVisualPosition,
    getMinAreaGridBounds,
    getVisualGridDimensions,
    hasAreaCell,
    isCenterOffset,
    iterGridCellsAsymmetric,
    MAX_AREA_GRID_N,
    normalizeAreaCells,
    setAreaCell,
    toggleAreaCell,
    transformGridBorderForDirection,
} from './figureAreaGrid'
import styles from './FigureAreaGrid.module.css'

export interface FigureAreaGridProps {
    cells: FigureEventAreaCell[]
    previewFigureId?: FigureId
    previewStateIndex?: number
    moveDirection?: FigureMoveDirection
    onChange: (cells: FigureEventAreaCell[]) => void
    singleCell?: boolean
    orientToTeamDirection?: boolean
    onOrientToggle?: () => void
}

const AREA_GRID_DRAG_PIXELS_PER_STEP = 8

type GridBorder = 'top' | 'bottom' | 'left' | 'right'
type GridCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

const GRID_BORDER_DRAG_DIRECTION: Record<GridBorder, NumberDragDirection> = {
    top: NumberDragDirection.ny,
    bottom: NumberDragDirection.y,
    left: NumberDragDirection.nx,
    right: NumberDragDirection.x,
}

const GRID_BORDER_HANDLES: Array<{ border: GridBorder; className: keyof typeof styles }> = [
    { border: 'top', className: 'gridResizeHandleTop' },
    { border: 'bottom', className: 'gridResizeHandleBottom' },
    { border: 'left', className: 'gridResizeHandleLeft' },
    { border: 'right', className: 'gridResizeHandleRight' },
]

const GRID_CORNER_BORDERS: Record<GridCorner, [GridBorder, GridBorder]> = {
    topLeft: ['top', 'left'],
    topRight: ['top', 'right'],
    bottomLeft: ['bottom', 'left'],
    bottomRight: ['bottom', 'right'],
}

const GRID_CORNER_HANDLES: Array<{ corner: GridCorner; className: keyof typeof styles }> = [
    { corner: 'topLeft', className: 'gridResizeHandleTopLeft' },
    { corner: 'topRight', className: 'gridResizeHandleTopRight' },
    { corner: 'bottomLeft', className: 'gridResizeHandleBottomLeft' },
    { corner: 'bottomRight', className: 'gridResizeHandleBottomRight' },
]

export const FigureAreaGrid: FC<FigureAreaGridProps> = ({
    cells,
    previewFigureId,
    previewStateIndex = 0,
    moveDirection,
    onChange,
    singleCell,
    orientToTeamDirection,
    onOrientToggle,
}) => {
    const normalizedCells = useMemo(() => normalizeAreaCells(cells), [cells])
    const minBounds = useMemo(() => getMinAreaGridBounds(normalizedCells), [normalizedCells])
    const [bounds, setBounds] = useState<AreaGridBounds>(minBounds)
    const [gridAreaSize, setGridAreaSize] = useState(AREA_GRID_AREA_SIZE)
    const gridAreaRef = useRef<HTMLDivElement>(null)
    const normalizedCellsRef = useRef(normalizedCells)
    normalizedCellsRef.current = normalizedCells
    // Set to true before emitting a change so the cells effect can skip the reset
    const internalChangeRef = useRef(false)

    // When cells change from outside (switching moves): reset to minimum.
    // When cells change from our own edit: skip reset, let the clamp effect handle expansion.
    useEffect(() => {
        if (internalChangeRef.current) {
            internalChangeRef.current = false
        } else {
            setBounds(getMinAreaGridBounds(normalizedCells))
        }
    }, [normalizedCells])

    // Safety net: reset when figure/state context changes independently of cells
    useEffect(() => {
        setBounds(getMinAreaGridBounds(normalizedCellsRef.current))
    }, [previewFigureId, previewStateIndex])

    // Expand bounds if a newly added cell falls outside the current grid
    useEffect(() => {
        setBounds(current => clampAreaGridBounds(current, normalizedCells))
    }, [normalizedCells])

    useEffect(() => {
        const gridArea = gridAreaRef.current

        if (!gridArea) {
            return
        }

        const updateSize = () => {
            setGridAreaSize(gridArea.clientWidth || AREA_GRID_AREA_SIZE)
        }

        updateSize()

        const observer = new ResizeObserver(updateSize)
        observer.observe(gridArea)

        return () => observer.disconnect()
    }, [])

    const emitChange = useCallback((nextCells: FigureEventAreaCell[]) => {
        internalChangeRef.current = true
        onChange(normalizeAreaCells(nextCells))
    }, [onChange])

    const handleBoundChange = useCallback((field: keyof AreaGridBounds, value: number) => {
        setBounds(current => {
            const next = { ...current, [field]: value }
            return clampAreaGridBounds(next, normalizedCells)
        })
    }, [normalizedCells])

    const handleGridBorderDrag = useCallback((
        border: GridBorder,
        event: DragEvent,
        _pointerEvent: PointerEvent,
        savedValue: number,
    ) => {
        const logicalBorder = moveDirection ? transformGridBorderForDirection(border, moveDirection) : border
        // drag direction follows the physical handle in screen space, not the logical bound
        const dragDirection = GRID_BORDER_DRAG_DIRECTION[border]
        const delta = scaleNumberDragDelta(
            getNumberDragDelta[dragDirection](event.x, event.y),
            AREA_GRID_DRAG_PIXELS_PER_STEP,
        )

        handleBoundChange(logicalBorder, savedValue + delta)
    }, [handleBoundChange, moveDirection])

    const handleGridCornerDrag = useCallback((
        corner: GridCorner,
        event: DragEvent,
        savedValue: [number, number],
    ) => {
        const [physBorder1, physBorder2] = GRID_CORNER_BORDERS[corner]
        const lb1 = moveDirection ? transformGridBorderForDirection(physBorder1, moveDirection) : physBorder1
        const lb2 = moveDirection ? transformGridBorderForDirection(physBorder2, moveDirection) : physBorder2
        const delta1 = scaleNumberDragDelta(
            getNumberDragDelta[GRID_BORDER_DRAG_DIRECTION[physBorder1]](event.x, event.y),
            AREA_GRID_DRAG_PIXELS_PER_STEP,
        )
        const delta2 = scaleNumberDragDelta(
            getNumberDragDelta[GRID_BORDER_DRAG_DIRECTION[physBorder2]](event.x, event.y),
            AREA_GRID_DRAG_PIXELS_PER_STEP,
        )
        setBounds(current => clampAreaGridBounds(
            { ...current, [lb1]: savedValue[0] + delta1, [lb2]: savedValue[1] + delta2 },
            normalizedCells,
        ))
    }, [moveDirection, normalizedCells])

    const handleCellClick = useCallback((event: React.MouseEvent, x: number, y: number) => {
        event.preventDefault()
        event.stopPropagation()

        if (isCenterOffset(x, y)) {
            return
        }

        emitChange(singleCell ? setAreaCell(normalizedCells, x, y) : toggleAreaCell(normalizedCells, x, y))
    }, [emitChange, normalizedCells, singleCell])

    const gridCells = useMemo(() => iterGridCellsAsymmetric(bounds), [bounds])
    const visualDims = useMemo(
        () => getVisualGridDimensions(bounds, moveDirection),
        [bounds, moveDirection],
    )
    const cellSize = gridAreaSize > 0
        ? Math.max(1, Math.floor((gridAreaSize - (visualDims.cols - 1)) / visualDims.cols))
        : 1
    const previewSize = Math.max(1, cellSize)
    const figureTransform = useMemo(() => {
        switch (moveDirection) {
            case 'right': return 'rotate(90deg)'
            case 'left': return 'rotate(-90deg)'
            case 'down': return 'rotate(180deg)'
            default: return undefined
        }
    }, [moveDirection])

    const teamArrowAngle = useMemo(() => {
        switch (moveDirection) {
            case 'right': return 90
            case 'down': return 180
            case 'left': return -90
            default: return 0
        }
    }, [moveDirection])

    const arrowMarkerId = useId().replace(/:/g, 'a')

    const arrowSvg = useMemo(() => {
        if (!singleCell || normalizedCells.length !== 1 || gridAreaSize === 0) return null
        const cell = normalizedCells[0]
        const anchorVisual = getCellVisualPosition(0, 0, bounds, moveDirection)
        const cellVisual = getCellVisualPosition(cell.x, cell.y, bounds, moveDirection)
        const step = cellSize + 1
        const ax = (anchorVisual.col - 1) * step + cellSize / 2
        const ay = (anchorVisual.row - 1) * step + cellSize / 2
        const bx = (cellVisual.col - 1) * step + cellSize / 2
        const by = (cellVisual.row - 1) * step + cellSize / 2
        const dx = bx - ax
        const dy = by - ay
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist === 0) return null
        const inset = Math.min(cellSize * 0.35, dist * 0.3)
        const ux = dx / dist
        const uy = dy / dist
        const x1 = ax + ux * inset
        const y1 = ay + uy * inset
        const x2 = bx - ux * inset
        const y2 = by - uy * inset
        const svgH = Math.round(gridAreaSize * visualDims.rows / visualDims.cols)
        return (
            <svg
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
                width={gridAreaSize}
                height={svgH}
                viewBox={`0 0 ${gridAreaSize} ${svgH}`}
            >
                <defs>
                    <marker
                        id={arrowMarkerId}
                        markerUnits="userSpaceOnUse"
                        markerWidth={8}
                        markerHeight={8}
                        refX={7}
                        refY={4}
                        orient="auto"
                    >
                        <path d="M0,0 L0,8 L7,4 z" fill="rgba(30, 80, 200, 0.85)" />
                    </marker>
                </defs>
                <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(30, 80, 200, 0.7)"
                    strokeWidth={1.5}
                    markerEnd={`url(#${arrowMarkerId})`}
                />
            </svg>
        )
    }, [singleCell, normalizedCells, gridAreaSize, bounds, moveDirection, cellSize, visualDims, arrowMarkerId])

    return (
        <div className={styles.areaGrid}>
            <div className={styles.gridFrame}>
                <div
                    ref={gridAreaRef}
                    className={styles.gridArea}
                    style={{
                        '--grid-cols': visualDims.cols,
                        '--grid-rows': visualDims.rows,
                    } as React.CSSProperties}
                >
                    {gridCells.map(({ x, y }) => {
                        const { col, row } = getCellVisualPosition(x, y, bounds, moveDirection)
                        const cellStyle = { gridColumn: col, gridRow: row }
                        const isCenter = isCenterOffset(x, y)
                        const isActive = hasAreaCell(normalizedCells, x, y)

                        if (isCenter) {
                            const centerClassName = [
                                styles.cellCenter,
                                onOrientToggle ? styles.cellCenterInteractive : '',
                            ].filter(Boolean).join(' ')

                            const orientTitle = onOrientToggle
                                ? (orientToTeamDirection
                                    ? 'Направление команды (клик — переключить на координаты доски)'
                                    : 'Координаты доски (клик — переключить на направление команды)')
                                : 'Якорная фигура'

                            return (
                                <div
                                    key={`${x},${y}`}
                                    className={centerClassName}
                                    style={cellStyle}
                                    title={orientTitle}
                                    onClick={onOrientToggle}
                                >
                                    {previewFigureId ? (
                                        <div
                                            className={styles.figurePreviewWrapper}
                                            style={figureTransform ? { transform: figureTransform, transformOrigin: 'center' } : undefined}
                                        >
                                            <FigureSVG
                                                className={styles.figurePreview}
                                                figureId={previewFigureId}
                                                stateIndex={previewStateIndex}
                                                width={previewSize}
                                                height={previewSize}
                                            />
                                        </div>
                                    ) : singleCell ? (
                                        <div className={styles.anchorGradient} />
                                    ) : (
                                        <span className={styles.anchorPlaceholder} style={{ fontSize: Math.max(8, Math.round(previewSize * 0.65)) }}>?</span>
                                    )}
                                    {onOrientToggle && (
                                        <svg
                                            className={styles.orientIndicator}
                                            viewBox="0 0 20 20"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            {orientToTeamDirection ? (
                                                <g transform={`rotate(${teamArrowAngle}, 10, 10)`}>
                                                    <line x1="4" y1="18.5" x2="4" y2="5.5" stroke="black" strokeWidth="1.5"/>
                                                    <polygon points="4,1.5 2,5.5 6,5.5" fill="black"/>
                                                </g>
                                            ) : (
                                                <>
                                                    <line x1="2" y1="2" x2="15.5" y2="2" stroke="#d33" strokeWidth="1.5"/>
                                                    <polygon points="18.5,2 14.5,0.5 14.5,3.5" fill="#d33"/>
                                                    <line x1="2" y1="2" x2="2" y2="15.5" stroke="#2a2" strokeWidth="1.5"/>
                                                    <polygon points="2,18.5 0.5,14.5 3.5,14.5" fill="#2a2"/>
                                                </>
                                            )}
                                        </svg>
                                    )}
                                </div>
                            )
                        }

                        const cellClassName = [
                            styles.cell,
                            isActive ? styles.cellActive : styles.cellEmpty,
                        ].filter(Boolean).join(' ')

                        return (
                            <div
                                key={`${x},${y}`}
                                className={cellClassName}
                                style={cellStyle}
                                title={isActive
                                    ? `Убрать клетку (${x}, ${y})`
                                    : `Добавить клетку (${x}, ${y})`}
                                onClick={event => handleCellClick(event, x, y)}
                            />
                        )
                    })}
                </div>
                {arrowSvg}
                {GRID_BORDER_HANDLES.map(({ border, className }) => {
                    const transformedBorder = moveDirection ? transformGridBorderForDirection(border, moveDirection) : border
                    return (
                        <DragHandler<number>
                            key={border}
                            className={styles[className]}
                            pointerLock
                            saveValue={bounds[transformedBorder]}
                            onChange={(event, pointerEvent, savedValue) => {
                                const logicalBorder = moveDirection ? transformGridBorderForDirection(border, moveDirection) : border
                                handleGridBorderDrag(border, event, pointerEvent, savedValue ?? bounds[logicalBorder])
                            }}
                            title={`Изменить границу. Тяните ${border === 'top' ? 'вверх' : border === 'bottom' ? 'вниз' : border === 'left' ? 'влево' : 'вправо'} — увеличить.`}
                        />
                    )
                })}
                {GRID_CORNER_HANDLES.map(({ corner, className }) => {
                    const [pb1, pb2] = GRID_CORNER_BORDERS[corner]
                    const lb1 = moveDirection ? transformGridBorderForDirection(pb1, moveDirection) : pb1
                    const lb2 = moveDirection ? transformGridBorderForDirection(pb2, moveDirection) : pb2
                    return (
                        <DragHandler<[number, number]>
                            key={corner}
                            className={styles[className]}
                            pointerLock
                            saveValue={[bounds[lb1], bounds[lb2]]}
                            onChange={(event, _pointerEvent, savedValue) => {
                                handleGridCornerDrag(corner, event, savedValue ?? [bounds[lb1], bounds[lb2]])
                            }}
                        />
                    )
                })}
            </div>
        </div>
    )
}
