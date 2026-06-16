import { CellCoord, coordKey } from './types/coords'
import { FigurePlacement } from './types/figures'
import { cloneFigurePlacement, placementsMatch } from './figureView'
import { FiguresSlice } from './state/slices'
import {
    StackPositionMode,
    StackTargetMode,
} from './types/events'

export type StackIndex = { coord: CellCoord; index: number }

export function isStackArray(value: unknown): value is FigurePlacement[] {
    return Array.isArray(value)
}

export function normalizeStackEntry(
    raw: FigurePlacement | FigurePlacement[] | undefined,
): FigurePlacement[] {
    if (!raw) {
        return []
    }

    if (Array.isArray(raw)) {
        return raw.map(cloneFigurePlacement)
    }

    return [cloneFigurePlacement(raw)]
}

export function getStack(figures: FiguresSlice, coord: CellCoord): FigurePlacement[] {
    return (figures.figuresByCoord[coordKey(coord)] ?? []).map(cloneFigurePlacement)
}

export function getTopOfStack(figures: FiguresSlice, coord: CellCoord): FigurePlacement | undefined {
    const stack = figures.figuresByCoord[coordKey(coord)]

    if (!stack || stack.length === 0) {
        return undefined
    }

    return stack[stack.length - 1]
}

export function isStackOccupied(figures: FiguresSlice, coord: CellCoord): boolean {
    const stack = figures.figuresByCoord[coordKey(coord)]
    return stack != null && stack.length > 0
}

export function findInstance(
    figures: FiguresSlice,
    instanceId: string,
): StackIndex | null {
    for (const [key, stack] of Object.entries(figures.figuresByCoord)) {
        const index = stack.findIndex(placement => placement.instanceId === instanceId)

        if (index >= 0) {
            const [i, j] = key.split(',').map(Number)
            return { coord: { i, j }, index }
        }
    }

    return null
}

export function findBoardCoordForPlacement(
    figures: FiguresSlice,
    placement: FigurePlacement,
): string | undefined {
    for (const [key, stack] of Object.entries(figures.figuresByCoord)) {
        if (stack.some(item => placementsMatch(item, placement))) {
            return key
        }
    }

    return undefined
}

export function placementMatchesAt(
    figures: FiguresSlice,
    coord: CellCoord,
    placement: FigurePlacement,
): boolean {
    const stack = figures.figuresByCoord[coordKey(coord)] ?? []
    return stack.some(item => placementsMatch(item, placement))
}

export function cloneFiguresByCoord(
    figuresByCoord: FiguresSlice['figuresByCoord'] | Record<string, FigurePlacement | FigurePlacement[]>,
): FiguresSlice['figuresByCoord'] {
    const next: FiguresSlice['figuresByCoord'] = {}

    for (const [key, stack] of Object.entries(figuresByCoord)) {
        next[key] = normalizeStackEntry(stack as FigurePlacement | FigurePlacement[] | undefined)
    }

    return next
}

function removeEmptyStacks(figuresByCoord: FiguresSlice['figuresByCoord']): FiguresSlice['figuresByCoord'] {
    const next: FiguresSlice['figuresByCoord'] = {}

    for (const [key, stack] of Object.entries(figuresByCoord)) {
        if (stack.length > 0) {
            next[key] = stack
        }
    }

    return next
}

function removeInstanceFromAllCoords(
    figuresByCoord: FiguresSlice['figuresByCoord'],
    placement: FigurePlacement,
    exceptKey?: string,
): FiguresSlice['figuresByCoord'] {
    const next = cloneFiguresByCoord(figuresByCoord)

    for (const [key, stack] of Object.entries(next)) {
        if (exceptKey && key === exceptKey) {
            continue
        }

        const filtered = stack.filter(item => !placementsMatch(item, placement))

        if (filtered.length > 0) {
            next[key] = filtered
        } else {
            delete next[key]
        }
    }

    return next
}

export function removePlacementFromBoard(
    figures: FiguresSlice,
    placement: FigurePlacement,
    preferredCoord?: CellCoord,
): FiguresSlice {
    let figuresByCoord = cloneFiguresByCoord(figures.figuresByCoord)

    if (preferredCoord) {
        const key = coordKey(preferredCoord)
        const stack = figuresByCoord[key]

        if (stack?.some(item => placementsMatch(item, placement))) {
            const filtered = stack.filter(item => !placementsMatch(item, placement))

            if (filtered.length > 0) {
                figuresByCoord[key] = filtered
            } else {
                delete figuresByCoord[key]
            }

            return { ...figures, figuresByCoord }
        }
    }

    const located = findInstance(figures, placement.instanceId)

    if (located) {
        const key = coordKey(located.coord)
        const stack = figuresByCoord[key] ?? []
        const filtered = stack.filter(item => !placementsMatch(item, placement))

        if (filtered.length > 0) {
            figuresByCoord[key] = filtered
        } else {
            delete figuresByCoord[key]
        }
    }

    return { ...figures, figuresByCoord: removeEmptyStacks(figuresByCoord) }
}

export function pushToStack(
    figures: FiguresSlice,
    coord: CellCoord,
    placement: FigurePlacement,
): FiguresSlice {
    const key = coordKey(coord)
    let figuresByCoord = removeInstanceFromAllCoords(figures.figuresByCoord, placement, key)
    const stack = [...(figuresByCoord[key] ?? [])]
    stack.push(cloneFigurePlacement(placement))
    figuresByCoord[key] = stack

    return { ...figures, figuresByCoord }
}

export function setStackAtCoord(
    figures: FiguresSlice,
    coord: CellCoord,
    stack: FigurePlacement[],
): FiguresSlice {
    const key = coordKey(coord)
    const figuresByCoord = cloneFiguresByCoord(figures.figuresByCoord)

    if (stack.length === 0) {
        delete figuresByCoord[key]
    } else {
        figuresByCoord[key] = stack.map(cloneFigurePlacement)
    }

    return { ...figures, figuresByCoord: removeEmptyStacks(figuresByCoord) }
}

export function replaceStackAtIndex(
    figures: FiguresSlice,
    coord: CellCoord,
    index: number,
    placement: FigurePlacement,
): FiguresSlice {
    const key = coordKey(coord)
    const stack = [...(figures.figuresByCoord[key] ?? [])]

    if (index < 0 || index >= stack.length) {
        return figures
    }

    stack[index] = cloneFigurePlacement(placement)

    return setStackAtCoord(figures, coord, stack)
}

export function resolveStackIndex(
    stackLength: number,
    mode: StackPositionMode,
    index = 0,
): number | null {
    if (stackLength <= 0) {
        return null
    }

    switch (mode) {
        case 'any':
            return null
        case 'top':
            return stackLength - 1
        case 'bottom':
            return 0
        case 'fromTop': {
            const resolved = stackLength - 1 - Math.max(0, Math.trunc(index))
            return resolved >= 0 && resolved < stackLength ? resolved : null
        }
        case 'fromBottom': {
            const resolved = Math.max(0, Math.trunc(index))
            return resolved < stackLength ? resolved : null
        }
        default:
            return null
    }
}

export function matchesStackPosition(
    stackLength: number,
    placementIndex: number,
    mode: StackPositionMode,
    index = 0,
): boolean {
    if (mode === 'any') {
        return true
    }

    const required = resolveStackIndex(stackLength, mode, index)
    return required != null && required === placementIndex
}

export function getStackPlacementsByFilter(
    stack: FigurePlacement[],
    mode: StackTargetMode,
    stackIndex: number,
    matches: (placement: FigurePlacement) => boolean,
): FigurePlacement[] {
    if (stack.length === 0) {
        return []
    }

    if (mode === 'all') {
        return stack.filter(matches)
    }

    const index = resolveStackIndex(stack.length, mode, stackIndex)

    if (index == null) {
        return []
    }

    const placement = stack[index]
    return placement && matches(placement) ? [placement] : []
}

export function iterBoardPlacements(
    figuresByCoord: FiguresSlice['figuresByCoord'],
): Array<{ coord: CellCoord; index: number; placement: FigurePlacement }> {
    const items: Array<{ coord: CellCoord; index: number; placement: FigurePlacement }> = []

    for (const [key, stack] of Object.entries(figuresByCoord)) {
        const [i, j] = key.split(',').map(Number)

        stack.forEach((placement, index) => {
            items.push({ coord: { i, j }, index, placement })
        })
    }

    return items
}

export function resolvePlacementSnapshot(
    figures: FiguresSlice,
    preferredCoord: CellCoord,
    snapshot: FigurePlacement,
): FigurePlacement {
    const stack = figures.figuresByCoord[coordKey(preferredCoord)] ?? []
    const atPreferred = stack.find(item => placementsMatch(item, snapshot))

    if (atPreferred) {
        return cloneFigurePlacement(atPreferred)
    }

    const boardKey = findBoardCoordForPlacement(figures, snapshot)

    if (boardKey) {
        const located = figures.figuresByCoord[boardKey].find(item => placementsMatch(item, snapshot))

        if (located) {
            return cloneFigurePlacement(located)
        }
    }

    return cloneFigurePlacement(snapshot)
}
