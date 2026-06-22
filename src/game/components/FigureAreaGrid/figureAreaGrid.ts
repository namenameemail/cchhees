import { FigureEventAreaCell } from '../../types/events'
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

export function getMinAreaGridN(cells: FigureEventAreaCell[]): number {
    return Math.max(1, getFarthestFigureAreaOffset(cells))
}

export function clampAreaGridN(n: number, cells: FigureEventAreaCell[]): number {
    const minN = getMinAreaGridN(cells)
    const truncated = Math.trunc(n)

    if (!Number.isFinite(truncated)) {
        return minN
    }

    return Math.max(minN, Math.min(MAX_MOVE_GRID_N, truncated))
}

export function hasAreaCell(cells: FigureEventAreaCell[], x: number, y: number): boolean {
    return hasFigureAreaCell(cells, x, y)
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
