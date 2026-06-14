import { CellCoord, coordKey, isCoordInGrid, parseCoordKey } from '../types/coords'
import { FigurePlacement } from '../types/figures'
import { cloneFigurePlacement } from '../figureView'
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
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        if (isCoordInGrid(parseCoordKey(key), n, m)) {
            figuresByCoord[key] = placement
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.map(cloneFigurePlacement),
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
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        figuresByCoord[key] = cloneFigurePlacement(placement)
    }

    return {
        figuresByCoord,
        tray: figures.tray.map(cloneFigurePlacement),
    }
}

export function cloneBoardSlice(board: BoardSlice): BoardSlice {
    return {
        boardParameters: { ...board.boardParameters },
        styleRules: board.styleRules.map(rule => ({ ...rule })),
        cellParametersByCoord: { ...board.cellParametersByCoord },
    }
}
