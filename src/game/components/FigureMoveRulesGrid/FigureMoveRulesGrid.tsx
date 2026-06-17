import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    DragEvent,
    DragHandler,
    getNumberDragDelta,
    NumberDragDirection,
    NumberDragPointerLockInput,
    scaleNumberDragDelta,
} from 'bbuutoonnss'
import { FigureId, FigureMoveRule } from '../../types/figures'
import { normalizeFigureMoveRules } from '../../figureView'
import { FigureSVG } from '../FigureSVG'
import {
    clampGridN,
    clampMoveRuleN,
    getMinGridN,
    getMoveGridCellSize,
    getMoveGridSize,
    getRuleAt,
    isCenterOffset,
    iterGridCells,
    MAX_MOVE_GRID_N,
    MAX_MOVE_GRID_CELL_SIZE,
    MOVE_GRID_AREA_SIZE,
    removeRule,
    upsertRule,
} from './moveRulesGrid'
import styles from './FigureMoveRulesGrid.module.css'

export interface FigureMoveRulesGridProps {
    figureId: FigureId
    stateIndex: number
    moveRules: FigureMoveRule[]
    onChange: (rules: FigureMoveRule[]) => void
}

function formatRuleN(n: number | undefined): string {
    const resolved = n === undefined ? 1 : n
    return resolved === 0 ? '∞' : String(resolved)
}

function getRuleNDragValue(n: number | undefined): number {
    return n === undefined ? 1 : n
}

const MOVE_RULES_DRAG_PIXELS_PER_STEP = 8
const GRID_BORDER_DRAG_PIXELS_PER_STEP = 20

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

export const FigureMoveRulesGrid: FC<FigureMoveRulesGridProps> = ({
    figureId,
    stateIndex,
    moveRules,
    onChange,
}) => {
    const minGridN = useMemo(() => getMinGridN(moveRules), [moveRules])
    const [gridN, setGridN] = useState(minGridN)
    const [gridAreaSize, setGridAreaSize] = useState(MOVE_GRID_AREA_SIZE)
    const gridAreaRef = useRef<HTMLDivElement>(null)
    const suppressCellClickRef = useRef(false)

    useEffect(() => {
        setGridN(getMinGridN(moveRules))
    }, [figureId, stateIndex])

    useEffect(() => {
        setGridN(current => clampGridN(current, moveRules))
    }, [moveRules])

    useEffect(() => {
        const gridArea = gridAreaRef.current

        if (!gridArea) {
            return
        }

        const updateSize = () => {
            setGridAreaSize(gridArea.clientWidth || MOVE_GRID_AREA_SIZE)
        }

        updateSize()

        const observer = new ResizeObserver(updateSize)
        observer.observe(gridArea)

        return () => observer.disconnect()
    }, [])

    const emitChange = useCallback((nextRules: FigureMoveRule[]) => {
        onChange(normalizeFigureMoveRules(nextRules))
    }, [onChange])

    const handleGridNChange = useCallback((value: number) => {
        setGridN(clampGridN(value, moveRules))
    }, [moveRules])

    const handleGridNBorderDrag = useCallback((
        border: GridBorder,
        event: DragEvent,
        _pointerEvent: PointerEvent,
        savedValue: number = minGridN,
    ) => {
        const direction = GRID_BORDER_DRAG_DIRECTION[border]
        const delta = scaleNumberDragDelta(
            getNumberDragDelta[direction](event.x, event.y),
            GRID_BORDER_DRAG_PIXELS_PER_STEP,
        )

        setGridN(clampGridN(savedValue + delta, moveRules))
    }, [minGridN, moveRules])

    const handleCellClick = useCallback((event: React.MouseEvent, x: number, y: number) => {
        event.preventDefault()
        event.stopPropagation()

        if (suppressCellClickRef.current) {
            suppressCellClickRef.current = false
            return
        }

        if (isCenterOffset(x, y)) {
            return
        }

        const existing = getRuleAt(moveRules, x, y)

        if (existing) {
            emitChange(removeRule(moveRules, x, y))
            return
        }

        emitChange(upsertRule(moveRules, { x, y, n: 1 }))
    }, [emitChange, moveRules])

    const handleRuleNDrag = useCallback((
        x: number,
        y: number,
        event: DragEvent,
        _pointerEvent: PointerEvent,
        savedValue: number = 1,
    ) => {
        const existing = getRuleAt(moveRules, x, y)

        if (!existing) {
            return
        }

        const delta = scaleNumberDragDelta(
            getNumberDragDelta[NumberDragDirection.ny](event.x, event.y),
            MOVE_RULES_DRAG_PIXELS_PER_STEP,
        )

        if (delta !== 0) {
            suppressCellClickRef.current = true
        }

        const nextN = clampMoveRuleN(savedValue + delta)

        emitChange(upsertRule(moveRules, {
            ...existing,
            n: nextN,
        }))
    }, [emitChange, moveRules])

    const cells = useMemo(() => iterGridCells(gridN), [gridN])
    const gridSize = getMoveGridSize(gridN)
    const cellSize = useMemo(
        () => Math.min(
            MAX_MOVE_GRID_CELL_SIZE,
            getMoveGridCellSize(gridN, gridAreaSize),
        ),
        [gridAreaSize, gridN],
    )
    const previewSize = Math.max(1, Math.floor(cellSize))
    const cellFontSize = Math.min(12, Math.max(9, Math.floor(cellSize * 0.26)))

    return (
        <div className={styles.moveRulesGrid}>
            <div className={styles.gridControls}>
                <label className={styles.gridNLabel}>
                    N
                    <NumberDragPointerLockInput
                        className={styles.gridNInput}
                        dragClassName={styles.dragInput}
                        value={gridN}
                        onChange={handleGridNChange}
                        min={minGridN}
                        max={MAX_MOVE_GRID_N}
                        step={1}
                        dragPixelsPerStep={MOVE_RULES_DRAG_PIXELS_PER_STEP}
                        changeOnChange
                        changeOnBlur
                        resetOnBlur
                        title={`Радиус сетки (${gridSize}×${gridSize}). Перетаскивание границ меняет N.`}
                    />
                </label>
            </div>
            <div
                className={styles.gridFrame}
                style={{ '--grid-size': gridSize } as React.CSSProperties}
            >
                <div
                    ref={gridAreaRef}
                    className={styles.gridArea}
                    style={{ '--grid-size': gridSize } as React.CSSProperties}
                >
                    {cells.map(({ gi, gj, x, y }) => {
                    const rule = getRuleAt(moveRules, x, y)
                    const isCenter = isCenterOffset(x, y)

                    if (isCenter) {
                        return (
                            <div
                                key={`${gi},${gj}`}
                                className={styles.cellCenter}
                                title="Фигура"
                            >
                                <FigureSVG
                                    className={styles.figurePreview}
                                    figureId={figureId}
                                    stateIndex={stateIndex}
                                    width={previewSize}
                                    height={previewSize}
                                />
                            </div>
                        )
                    }

                    const cellClassName = [
                        styles.cell,
                        rule ? styles.cellRule : styles.cellEmpty,
                    ].filter(Boolean).join(' ')

                    return (
                        <div
                            key={`${gi},${gj}`}
                            className={cellClassName}
                            title={rule
                                ? `Ход (${x}, ${y}), n=${formatRuleN(rule.n)}. Клик — удалить. Перетаскивание — изменить n.`
                                : `Клик — добавить ход (${x}, ${y})`}
                            onClick={event => handleCellClick(event, x, y)}
                        >
                            {rule ? (
                                <DragHandler<number>
                                    className={styles.ruleDragArea}
                                    saveValue={getRuleNDragValue(rule.n)}
                                    onChange={(event, pointerEvent, savedValue) => {
                                        handleRuleNDrag(x, y, event, pointerEvent, savedValue)
                                    }}
                                >
                                    <span
                                        className={styles.ruleMarker}
                                        style={{ fontSize: cellFontSize }}
                                    >
                                        {formatRuleN(rule.n)}
                                    </span>
                                </DragHandler>
                            ) : null}
                        </div>
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
