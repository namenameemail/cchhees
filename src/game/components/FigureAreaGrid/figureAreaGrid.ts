import { FigureEventAreaCell } from '../../types/events'
import { FigureMoveDirection } from '../../types/figures'
import {
    getFarthestFigureAreaOffset,
    hasFigureAreaCell,
    normalizeFigureAreaCells,
} from '../../figureAreaCells'
import {
    getMoveGridCellSize,
    getMoveGridSize,
    isCenterOffset,
    iterGridCells,
    MAX_MOVE_GRID_N,
    MOVE_GRID_AREA_SIZE,
} from '../FigureMoveRulesGrid/moveRulesGrid'

export {
    MAX_MOVE_GRID_N as MAX_AREA_GRID_N,
    MOVE_GRID_AREA_SIZE as AREA_GRID_AREA_SIZE,
    getMoveGridCellSize as getAreaGridCellSize,
    getMoveGridSize as getAreaGridSize,
    iterGridCells,
    isCenterOffset,
    normalizeFigureAreaCells as normalizeAreaCells,
}

export function iterGridCellsAsymmetric(bounds: AreaGridBounds): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = []

    for (let y = -bounds.top; y <= bounds.bottom; y += 1) {
        for (let x = -bounds.left; x <= bounds.right; x += 1) {
            cells.push({ x, y })
        }
    }

    return cells
}

// Maps visual handle position → logical bound it controls after CSS rotation.
// rotate(-90deg) = 'right': visual top ← original right side, etc.
export function getVisualGridDimensions(
    bounds: AreaGridBounds,
    direction?: FigureMoveDirection,
): { cols: number; rows: number } {
    const w = bounds.left + 1 + bounds.right
    const h = bounds.top + 1 + bounds.bottom
    if (direction === 'left' || direction === 'right') {
        return { cols: h, rows: w }
    }
    return { cols: w, rows: h }
}

// Returns 1-indexed col/row for explicit CSS grid placement, accounting for direction.
export function getCellVisualPosition(
    x: number,
    y: number,
    bounds: AreaGridBounds,
    direction?: FigureMoveDirection,
): { col: number; row: number } {
    switch (direction) {
        case 'right': // rotate(90deg) CW: left(-x)→top, top(-y)→right, right(+x)→bottom, bottom(+y)→left
            return {
                col: bounds.bottom - y + 1,
                row: x + bounds.left + 1,
            }
        case 'down': // rotate(180deg)
            return {
                col: bounds.right - x + 1,
                row: bounds.bottom - y + 1,
            }
        case 'left': // rotate(-90deg) CCW: right(+x)→top, top(-y)→left, left(-x)→bottom, bottom(+y)→right
            return {
                col: y + bounds.top + 1,
                row: bounds.right - x + 1,
            }
        case 'up':
        default:
            return {
                col: x + bounds.left + 1,
                row: y + bounds.top + 1,
            }
    }
}

export function transformGridBorderForDirection(
    border: 'top' | 'bottom' | 'left' | 'right',
    direction: FigureMoveDirection,
): 'top' | 'bottom' | 'left' | 'right' {
    type Map = Record<'top' | 'bottom' | 'left' | 'right', 'top' | 'bottom' | 'left' | 'right'>
    switch (direction) {
        case 'right': { // rotate(90deg) CW: top←left, right←top, bottom←right, left←bottom
            const m: Map = { top: 'left', right: 'top', bottom: 'right', left: 'bottom' }
            return m[border]
        }
        case 'down': { // rotate(180deg): top←bottom, right←left, bottom←top, left←right
            const m: Map = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' }
            return m[border]
        }
        case 'left': { // rotate(-90deg) CCW: top←right, right←bottom, bottom←left, left←top
            const m: Map = { top: 'right', right: 'bottom', bottom: 'left', left: 'top' }
            return m[border]
        }
        case 'up':
        default:
            return border
    }
}

export function getMinAreaGridN(cells: FigureEventAreaCell[]): number {
    return Math.max(1, getFarthestFigureAreaOffset(cells))
}

export interface AreaGridBounds {
    top: number
    right: number
    bottom: number
    left: number
}

export function getMinAreaGridBounds(cells: FigureEventAreaCell[]): AreaGridBounds {
    let minTop = 0
    let minRight = 0
    let minBottom = 0
    let minLeft = 0

    for (const cell of cells) {
        const x = Math.trunc(cell.x)
        const y = Math.trunc(cell.y)

        if (y < 0) {
            minTop = Math.max(minTop, -y)
        }
        if (y > 0) {
            minBottom = Math.max(minBottom, y)
        }
        if (x > 0) {
            minRight = Math.max(minRight, x)
        }
        if (x < 0) {
            minLeft = Math.max(minLeft, -x)
        }
    }

    return { top: minTop, right: minRight, bottom: minBottom, left: minLeft }
}

export function clampAreaGridN(n: number, cells: FigureEventAreaCell[]): number {
    const minN = getMinAreaGridN(cells)
    const truncated = Math.trunc(n)

    if (!Number.isFinite(truncated)) {
        return minN
    }

    return Math.max(minN, Math.min(MAX_MOVE_GRID_N, truncated))
}

export function clampAreaGridBounds(bounds: AreaGridBounds, cells: FigureEventAreaCell[]): AreaGridBounds {
    const minBounds = getMinAreaGridBounds(cells)

    const clampValue = (value: number, min: number): number => {
        const truncated = Math.trunc(value)
        return Math.max(min, Math.min(MAX_MOVE_GRID_N, Number.isFinite(truncated) ? truncated : min))
    }

    return {
        top: clampValue(bounds.top, minBounds.top),
        right: clampValue(bounds.right, minBounds.right),
        bottom: clampValue(bounds.bottom, minBounds.bottom),
        left: clampValue(bounds.left, minBounds.left),
    }
}

export function getAreaGridAsymmetricSize(bounds: AreaGridBounds): { width: number; height: number } {
    return {
        width: bounds.left + 1 + bounds.right,
        height: bounds.top + 1 + bounds.bottom,
    }
}

export function hasAreaCell(cells: FigureEventAreaCell[], x: number, y: number): boolean {
    return hasFigureAreaCell(cells, x, y)
}

export function setAreaCell(cells: FigureEventAreaCell[], x: number, y: number): FigureEventAreaCell[] {
    const tx = Math.trunc(x)
    const ty = Math.trunc(y)

    if (isCenterOffset(tx, ty)) {
        return normalizeFigureAreaCells(cells)
    }

    if (hasFigureAreaCell(cells, tx, ty)) {
        return []
    }

    return normalizeFigureAreaCells([{ x: tx, y: ty }])
}

export function toggleAreaCell(cells: FigureEventAreaCell[], x: number, y: number): FigureEventAreaCell[] {
    const tx = Math.trunc(x)
    const ty = Math.trunc(y)

    if (isCenterOffset(tx, ty)) {
        return normalizeFigureAreaCells(cells)
    }

    if (hasFigureAreaCell(cells, tx, ty)) {
        return normalizeFigureAreaCells(
            cells.filter(cell => !(Math.trunc(cell.x) === tx && Math.trunc(cell.y) === ty)),
        )
    }

    return normalizeFigureAreaCells([...cells, { x: tx, y: ty }])
}
