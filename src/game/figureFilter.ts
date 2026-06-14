import { FigureId } from './types/figures'

export const FIGURE_FILTER_ANY = '*' as FigureId
export const FIGURE_FILTER_NONE = '!' as FigureId

export function isFigureFilterAny(figureId?: FigureId): boolean {
    return figureId === FIGURE_FILTER_ANY
}

export function isFigureFilterNone(figureId?: FigureId): boolean {
    return figureId === FIGURE_FILTER_NONE
}

export function isFigureFilterSentinel(figureId?: FigureId): boolean {
    return isFigureFilterAny(figureId) || isFigureFilterNone(figureId)
}

export function isConcreteFigureFilter(figureId?: FigureId): figureId is FigureId {
    return typeof figureId === 'string'
        && figureId.length > 0
        && !isFigureFilterSentinel(figureId)
}

export function matchesFigureFilter(filterId: FigureId | undefined, actualFigureId: FigureId): boolean {
    if (filterId === FIGURE_FILTER_NONE) {
        return false
    }

    if (filterId === FIGURE_FILTER_ANY || filterId === undefined) {
        return true
    }

    return actualFigureId === filterId
}

export function normalizeStoredFigureFilterId(id?: FigureId): FigureId | undefined {
    if (typeof id !== 'string') {
        return undefined
    }

    const trimmed = id.trim()

    if (trimmed === FIGURE_FILTER_ANY || trimmed === FIGURE_FILTER_NONE) {
        return trimmed as FigureId
    }

    if (trimmed) {
        return trimmed as FigureId
    }

    return undefined
}

export type FigureFilterDisplayMode = 'any' | 'none' | 'figure'

export function resolveFigureFilterDisplayMode(
    figureId: FigureId | undefined,
    allowAny: boolean,
    hasCatalogEntry: boolean,
): FigureFilterDisplayMode {
    if (isFigureFilterNone(figureId)) {
        return 'none'
    }

    if (isFigureFilterAny(figureId) || (figureId === undefined && allowAny)) {
        return 'any'
    }

    if (hasCatalogEntry) {
        return 'figure'
    }

    return 'none'
}
