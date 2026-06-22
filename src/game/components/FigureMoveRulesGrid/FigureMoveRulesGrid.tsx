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
import { createDefaultMoveRule } from '../../migrateFigureMoveRules'
import { FigureSVG } from '../FigureSVG'
import {
    clampGridN,
    getMinGridN,
    getMoveGridCellSize,
    getMoveGridSize,
    getRuleAt,
    hasEnabledVariant,
    isCenterOffset,
    isSameOffset,
    iterGridCells,
    MAX_MOVE_GRID_N,
    MAX_MOVE_GRID_CELL_SIZE,
    MOVE_GRID_AREA_SIZE,
    upsertRule,
} from './moveRulesGrid'
import styles from './FigureMoveRulesGrid.module.css'

export interface FigureMoveRulesGridProps {
    figureId: FigureId
    stateIndex: number
    moveRules: FigureMoveRule[]
    selectedOffset: { x: number; y: number } | null
    onChange: (rules: FigureMoveRule[]) => void
    onSelect: (offset: { x: number; y: number } | null) => void
}

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

function getRuleCellClassName(rule: FigureMoveRule | undefined, selected: boolean): string {
    const classes = [styles.cell]

    if (!rule || !hasEnabledVariant(rule)) {
        classes.push(styles.cellEmpty)
    } else {
        if (rule.empty.enabled) {
            classes.push(styles.cellRuleEmpty)
        }

        if (rule.capture.enabled) {
            classes.push(styles.cellRuleCapture)
        }

        if (rule.jumpOver.enabled) {
            classes.push(styles.cellRuleJumpOver)
        }
    }

    if (selected) {
        classes.push(styles.cellSelected)
    }

    return classes.filter(Boolean).join(' ')
}

export const FigureMoveRulesGrid: FC<FigureMoveRulesGridProps> = ({
    figureId,
    stateIndex,
    moveRules,
    selectedOffset,
    onChange,
    onSelect,
}) => {
    const minGridN = useMemo(() => getMinGridN(moveRules), [moveRules])
    const [gridN, setGridN] = useState(minGridN)
    const [gridAreaSize, setGridAreaSize] = useState(MOVE_GRID_AREA_SIZE)
    const gridAreaRef = useRef<HTMLDivElement>(null)

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

        if (isCenterOffset(x, y)) {
            return
        }

        const existing = getRuleAt(moveRules, x, y)

        if (existing) {
            onSelect(isSameOffset(selectedOffset, { x, y }) ? null : { x, y })
            return
        }

        const nextRule = createDefaultMoveRule(x, y)
        emitChange(upsertRule(moveRules, nextRule))
        onSelect({ x, y })
    }, [emitChange, moveRules, onSelect, selectedOffset])

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
                        dragPixelsPerStep={GRID_BORDER_DRAG_PIXELS_PER_STEP}
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
                        const selected = isSameOffset(selectedOffset, { x, y })

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

                        return (
                            <div
                                key={`${gi},${gj}`}
                                className={getRuleCellClassName(rule, selected)}
                                title={rule
                                    ? `Направление (${x}, ${y}). ЛКМ — выбрать.`
                                    : `ЛКМ — добавить ход (${x}, ${y}).`}
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
