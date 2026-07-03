import { CellCoord, coordKey, parseCoordKey } from '../types/coords'
import {
    FigureEventAreaCell,
    FigureEventBoardRect,
    FigureEventCoord,
    MovePhase,
} from '../types/events'
import { FigurePlacement } from '../types/figures'
import { hasFigureAreaCell } from '../figureAreaCells'

export type BoardStacks = Record<string, FigurePlacement[]>

export function toOneBased(coord: { i: number; j: number }) {
    return { x: coord.i + 1, y: coord.j + 1 }
}

export function isSameCell(
    coord: { i: number; j: number },
    x: number,
    y: number,
) {
    const oneBased = toOneBased(coord)
    return oneBased.x === x && oneBased.y === y
}

export function isInsideRect(
    coord: { i: number; j: number },
    params: FigureEventBoardRect,
) {
    const { x, y } = toOneBased(coord)
    const xMin = Math.min(params.x1, params.x2)
    const xMax = Math.max(params.x1, params.x2)
    const yMin = Math.min(params.y1, params.y2)
    const yMax = Math.max(params.y1, params.y2)

    return x >= xMin && x <= xMax && y >= yMin && y <= yMax
}

export function isInsideFigureArea(
    coord: { i: number; j: number },
    anchor: { i: number; j: number },
    cells: FigureEventAreaCell[],
) {
    const dx = coord.i - anchor.i
    const dy = coord.j - anchor.j

    return hasFigureAreaCell(cells, dx, dy)
}

export function normalizeBoardStacks(
    board?: Record<string, FigurePlacement | FigurePlacement[]>,
): BoardStacks {
    if (!board) {
        return {}
    }

    const normalized: BoardStacks = {}

    for (const [key, value] of Object.entries(board)) {
        normalized[key] = Array.isArray(value) ? value : [value]
    }

    return normalized
}

export function resolvePlacementCoordBefore(
    placement: FigurePlacement,
    beforeBoard: BoardStacks | undefined,
): CellCoord | undefined {
    if (!beforeBoard) {
        return undefined
    }

    for (const [key, stack] of Object.entries(beforeBoard)) {
        if (stack.some(candidate => candidate.instanceId === placement.instanceId)) {
            return parseCoordKey(key)
        }
    }

    return undefined
}

/**
 * Единая точка вычисления movePhase: 'before'/'after' берут значение предиката в
 * соответствующей фазе напрямую, 'entered'/'left' сравнивают значения до и после.
 */
export function evaluateByMovePhase(
    movePhase: MovePhase | undefined,
    computeAt: (which: 'before' | 'after') => boolean,
): boolean {
    switch (movePhase ?? 'after') {
        case 'before':
            return computeAt('before')
        case 'after':
            return computeAt('after')
        case 'entered':
            return computeAt('after') && !computeAt('before')
        case 'left':
            return !computeAt('after') && computeAt('before')
        default:
            return computeAt('after')
    }
}

export function isNewlyInArea(
    subjectAfter: CellCoord,
    subjectBefore: CellCoord | undefined,
    anchorAfter: CellCoord,
    anchorBefore: CellCoord | undefined,
    cells: FigureEventAreaCell[],
): boolean {
    return evaluateByMovePhase('entered', which => isInsideFigureArea(
        which === 'after' ? subjectAfter : (subjectBefore ?? subjectAfter),
        which === 'after' ? anchorAfter : (anchorBefore ?? anchorAfter),
        cells,
    ))
}

export function coordMatchesList(
    coord: CellCoord,
    cells: FigureEventCoord[],
): boolean {
    return cells.some(cell => isSameCell(coord, cell.x, cell.y))
}

export function allCoordsMatchList(
    coord: CellCoord,
    cells: FigureEventCoord[],
): boolean {
    return cells.length > 0 && cells.every(cell => isSameCell(coord, cell.x, cell.y))
}
