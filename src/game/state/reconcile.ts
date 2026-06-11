import { CellCoord, coordKey, isCoordInGrid, parseCoordKey } from '../types/coords'
import { FigureId } from '../types/figures'
import { FiguresSlice, BoardSlice } from './slices'

export function getGridLength(n: number, m: number): number {
    return (+n) * (+m)
}

export function getFiguresOutsideGrid(figures: FiguresSlice, n: number, m: number): CellCoord[] {
    return Object.keys(figures.figuresByCoord)
        .map(parseCoordKey)
        .filter(coord => !isCoordInGrid(coord, n, m))
        .sort((a, b) => a.j - b.j || a.i - b.i)
}

export function countFiguresOutsideGrid(figures: FiguresSlice, n: number, m: number): number {
    return getFiguresOutsideGrid(figures, n, m).length
}

export function isGridShrink(
    oldParams: { n: number; m: number },
    newParams: { n: number; m: number },
): boolean {
    return getGridLength(newParams.n, newParams.m) < getGridLength(oldParams.n, oldParams.m)
}

export function pruneFigures(figures: FiguresSlice, n: number, m: number): FiguresSlice {
    const figuresByCoord: Record<string, FigureId> = {}

    for (const [key, figure] of Object.entries(figures.figuresByCoord)) {
        if (isCoordInGrid(parseCoordKey(key), n, m)) {
            figuresByCoord[key] = figure
        }
    }

    return {
        figuresByCoord,
        tray: [...figures.tray],
    }
}

export function pruneCellParameters(board: BoardSlice, n: number, m: number): BoardSlice {
    const cellParametersByCoord: BoardSlice['cellParametersByCoord'] = {}

    for (const [key, params] of Object.entries(board.cellParametersByCoord)) {
        if (isCoordInGrid(parseCoordKey(key), n, m)) {
            cellParametersByCoord[key] = params
        }
    }

    return {
        ...board,
        cellParametersByCoord,
    }
}

export function cloneFiguresSlice(figures: FiguresSlice): FiguresSlice {
    return {
        figuresByCoord: { ...figures.figuresByCoord },
        tray: [...figures.tray],
    }
}

export function cloneBoardSlice(board: BoardSlice): BoardSlice {
    return {
        boardParameters: { ...board.boardParameters },
        boardConditions: [...board.boardConditions],
        connectionsConditions: [...board.connectionsConditions],
        cellParametersByCoord: { ...board.cellParametersByCoord },
        figureCatalog: board.figureCatalog.map(entry => ({
            id: entry.id,
            viewParams: { ...entry.viewParams },
        })),
    }
}
