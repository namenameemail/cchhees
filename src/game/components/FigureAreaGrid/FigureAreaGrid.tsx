import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    DragEvent,
    DragHandler,
    getNumberDragDelta,
    NumberDragDirection,
    NumberDragPointerLockInput,
    scaleNumberDragDelta,
} from 'bbuutoonnss'
import { FigureId } from '../../types/figures'
import { FigureEventAreaCell } from '../../types/events'
import { FigureSVG } from '../FigureSVG'
import {
    AREA_GRID_AREA_SIZE,
    clampAreaGridN,
    getAreaGridCellSize,
    getAreaGridSize,
    getMinAreaGridN,
    hasAreaCell,
    isCenterOffset,
    iterGridCells,
    MAX_AREA_GRID_N,
    normalizeAreaCells,
    toggleAreaCell,
} from './figureAreaGrid'
import styles from './FigureAreaGrid.module.css'

export interface FigureAreaGridProps {
    cells: FigureEventAreaCell[]
    previewFigureId?: FigureId
    previewStateIndex?: number
    onChange: (cells: FigureEventAreaCell[]) => void
}

const AREA_GRID_DRAG_PIXELS_PER_STEP = 8

type GridBorder = 'top' | 'bottom' | 'left' | 'right'

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

export const FigureAreaGrid: FC<FigureAreaGridProps> = ({
    cells,
    previewFigureId,
    previewStateIndex = 0,
    onChange,
}) => {
    const normalizedCells = useMemo(() => normalizeAreaCells(cells), [cells])
    const minGridN = useMemo(() => getMinAreaGridN(normalizedCells), [normalizedCells])
    const [gridN, setGridN] = useState(minGridN)
    const [gridAreaSize, setGridAreaSize] = useState(AREA_GRID_AREA_SIZE)
    const gridAreaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setGridN(getMinAreaGridN(normalizedCells))
    }, [previewFigureId, previewStateIndex])

    useEffect(() => {
        setGridN(current => clampAreaGridN(current, normalizedCells))
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
        onChange(normalizeAreaCells(nextCells))
    }, [onChange])

    const handleGridNChange = useCallback((value: number) => {
        setGridN(clampAreaGridN(value, normalizedCells))
    }, [normalizedCells])

    const handleGridNBorderDrag = useCallback((
        border: GridBorder,
        event: DragEvent,
        _pointerEvent: PointerEvent,
        savedValue: number = minGridN,
    ) => {
        const direction = GRID_BORDER_DRAG_DIRECTION[border]
        const delta = scaleNumberDragDelta(
            getNumberDragDelta[direction](event.x, event.y),
            AREA_GRID_DRAG_PIXELS_PER_STEP,
        )

        setGridN(clampAreaGridN(savedValue + delta, normalizedCells))
    }, [minGridN, normalizedCells])

    const handleCellClick = useCallback((event: React.MouseEvent, x: number, y: number) => {
        event.preventDefault()
        event.stopPropagation()

        if (isCenterOffset(x, y)) {
            return
        }

        emitChange(toggleAreaCell(normalizedCells, x, y))
    }, [emitChange, normalizedCells])

    const gridCells = useMemo(() => iterGridCells(gridN), [gridN])
    const gridSize = getAreaGridSize(gridN)
    const cellSize = useMemo(
        () => getAreaGridCellSize(gridN, gridAreaSize),
        [gridAreaSize, gridN],
    )
    const previewSize = Math.max(1, Math.floor(cellSize))

    return (
        <div className={styles.areaGrid}>
            <div className={styles.gridControls}>
                <label className={styles.gridNLabel}>
                    N
                    <NumberDragPointerLockInput
                        className={styles.gridNInput}
                        dragClassName={styles.dragInput}
                        value={gridN}
                        onChange={handleGridNChange}
                        min={minGridN}
                        max={MAX_AREA_GRID_N}
                        step={1}
                        dragPixelsPerStep={AREA_GRID_DRAG_PIXELS_PER_STEP}
                        changeOnChange
                        changeOnBlur
                        resetOnBlur
                        title={`Радиус сетки (${gridSize}×${gridSize}). Перетаскивание границ меняет N.`}
                    />
                </label>
            </div>
            <div className={styles.gridFrame}>
                <div
                    ref={gridAreaRef}
                    className={styles.gridArea}
                    style={{ '--grid-size': gridSize } as React.CSSProperties}
                >
                    {gridCells.map(({ gi, gj, x, y }) => {
                        const isCenter = isCenterOffset(x, y)
                        const isActive = hasAreaCell(normalizedCells, x, y)

                        if (isCenter) {
                            return (
                                <div
                                    key={`${gi},${gj}`}
                                    className={styles.cellCenter}
                                    title="Якорная фигура"
                                >
                                    {previewFigureId ? (
                                        <FigureSVG
                                            className={styles.figurePreview}
                                            figureId={previewFigureId}
                                            stateIndex={previewStateIndex}
                                            width={previewSize}
                                            height={previewSize}
                                        />
                                    ) : (
                                        <span className={styles.anchorPlaceholder}>?</span>
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
                                key={`${gi},${gj}`}
                                className={cellClassName}
                                title={isActive
                                    ? `Убрать клетку (${x}, ${y})`
                                    : `Добавить клетку (${x}, ${y})`}
                                onClick={event => handleCellClick(event, x, y)}
                            />
                        )
                    })}
                </div>
                {GRID_BORDER_HANDLES.map(({ border, className }) => (
                    <DragHandler<number>
                        key={border}
                        className={styles[className]}
                        pointerLock
                        saveValue={gridN}
                        onChange={(event, pointerEvent, savedValue) => {
                            handleGridNBorderDrag(border, event, pointerEvent, savedValue)
                        }}
                        title={`Изменить радиус сетки (N). Тяните ${border === 'top' ? 'вверх' : border === 'bottom' ? 'вниз' : border === 'left' ? 'влево' : 'вправо'} — увеличить.`}
                    />
                ))}
            </div>
        </div>
    )
}
