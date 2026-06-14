import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { NumberDragPointerLockInput } from 'bbuutoonnss'
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

function offsetsEqual(
    left: { x: number; y: number } | null,
    right: { x: number; y: number },
): boolean {
    return left !== null && left.x === right.x && left.y === right.y
}

function formatRuleN(n: number | undefined): string {
    const resolved = n === undefined ? 1 : n
    return resolved === 0 ? '∞' : String(resolved)
}

export const FigureMoveRulesGrid: FC<FigureMoveRulesGridProps> = ({
    figureId,
    stateIndex,
    moveRules,
    onChange,
}) => {
    const minGridN = useMemo(() => getMinGridN(moveRules), [moveRules])
    const [gridN, setGridN] = useState(minGridN)
    const [selected, setSelected] = useState<{ x: number; y: number } | null>(null)

    useEffect(() => {
        setGridN(getMinGridN(moveRules))
        setSelected(null)
    }, [figureId, stateIndex])

    useEffect(() => {
        setGridN(current => clampGridN(current, moveRules))
    }, [moveRules])

    useEffect(() => {
        if (selected && !getRuleAt(moveRules, selected.x, selected.y)) {
            setSelected(null)
        }
    }, [moveRules, selected])

    const emitChange = useCallback((nextRules: FigureMoveRule[]) => {
        onChange(normalizeFigureMoveRules(nextRules))
    }, [onChange])

    const handleGridNChange = useCallback((value: number) => {
        setGridN(clampGridN(value, moveRules))
    }, [moveRules])

    const handleGridWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault()

        const combinedDelta = event.deltaX + event.deltaY

        if (combinedDelta === 0) {
            return
        }

        setGridN(current => clampGridN(current + (combinedDelta > 0 ? -1 : 1), moveRules))
    }, [moveRules])

    const handleCellClick = useCallback((x: number, y: number) => {
        if (isCenterOffset(x, y)) {
            return
        }

        const existing = getRuleAt(moveRules, x, y)

        if (existing) {
            if (offsetsEqual(selected, { x, y })) {
                emitChange(removeRule(moveRules, x, y))
                setSelected(null)
                return
            }

            setSelected({ x, y })
            return
        }

        const nextRules = upsertRule(moveRules, { x, y, n: 1 })
        emitChange(nextRules)
        setSelected({ x, y })
    }, [emitChange, moveRules, selected])

    const handleNChange = useCallback((x: number, y: number, nextValue: number) => {
        const existing = getRuleAt(moveRules, x, y)

        if (!existing) {
            return
        }

        emitChange(upsertRule(moveRules, {
            ...existing,
            n: clampMoveRuleN(nextValue),
        }))
    }, [emitChange, moveRules])

    const cells = useMemo(() => iterGridCells(gridN), [gridN])
    const gridSize = getMoveGridSize(gridN)
    const cellSize = useMemo(() => getMoveGridCellSize(gridN), [gridN])
    const figureSize = Math.max(12, Math.floor(cellSize * 0.82))
    const cellFontSize = Math.max(8, Math.floor(cellSize * 0.38))

    return (
        <div className={styles.moveRulesGrid}>
            <div className={styles.gridControls}>
                <label className={styles.gridNLabel}>
                    N
                    <NumberDragPointerLockInput
                        className={styles.gridNInput}
                        value={gridN}
                        onChange={handleGridNChange}
                        min={minGridN}
                        max={MAX_MOVE_GRID_N}
                        step={1}
                        pointerLock={false}
                        changeOnBlur
                        resetOnBlur
                        title={`Радиус сетки (${gridSize}×${gridSize}). Колесо над полем меняет N.`}
                    />
                </label>
            </div>
            <div
                className={styles.gridArea}
                style={{ '--grid-size': gridSize } as React.CSSProperties}
                onWheel={handleGridWheel}
            >
                {cells.map(({ gi, gj, x, y }) => {
                    const rule = getRuleAt(moveRules, x, y)
                    const isCenter = isCenterOffset(x, y)
                    const isSelected = offsetsEqual(selected, { x, y })

                    if (isCenter) {
                        return (
                            <div
                                key={`${gi},${gj}`}
                                className={`${styles.cell} ${styles.cellCenter}`}
                                title="Фигура"
                            >
                                <FigureSVG
                                    className={styles.figurePreview}
                                    figureId={figureId}
                                    stateIndex={stateIndex}
                                    size={figureSize}
                                />
                            </div>
                        )
                    }

                    const cellClassName = [
                        styles.cell,
                        rule ? styles.cellRule : styles.cellEmpty,
                        isSelected ? styles.cellSelected : '',
                    ].filter(Boolean).join(' ')

                    return (
                        <button
                            key={`${gi},${gj}`}
                            type="button"
                            className={cellClassName}
                            title={rule
                                ? `Ход (${x}, ${y}), n=${formatRuleN(rule.n)}. Повторный клик — удалить.`
                                : `Добавить ход (${x}, ${y})`}
                            onClick={() => handleCellClick(x, y)}
                        >
                            {isSelected ? (
                                <span
                                    className={styles.nInputWrap}
                                    style={{ fontSize: cellFontSize }}
                                    onPointerDown={event => event.stopPropagation()}
                                    onClick={event => event.stopPropagation()}
                                >
                                    <NumberDragPointerLockInput
                                        className={styles.nInput}
                                        value={rule?.n === undefined ? 1 : rule.n}
                                        onChange={nextValue => handleNChange(x, y, nextValue)}
                                        min={0}
                                        max={100}
                                        step={1}
                                        pointerLock={false}
                                        changeOnBlur
                                        resetOnBlur
                                        title="n (0 = бесконечно)"
                                    />
                                </span>
                            ) : rule ? (
                                <span
                                    className={styles.ruleMarker}
                                    style={{ fontSize: cellFontSize }}
                                >
                                    {formatRuleN(rule.n)}
                                </span>
                            ) : null}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
