import { FigureEventFigureFilter } from './types/events'
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

export function normalizeFigureFilterEntry(
    entry?: FigureEventFigureFilter,
): FigureEventFigureFilter | null {
    const figureId = normalizeStoredFigureFilterId(entry?.figureId)

    if (!figureId) {
        return null
    }

    const normalized: FigureEventFigureFilter = { figureId }

    if (entry?.stateIndex !== undefined && Number.isFinite(entry.stateIndex)) {
        normalized.stateIndex = Math.max(0, Math.trunc(entry.stateIndex))
    }

    return normalized
}

export function getFigureFilterEntryKey(entry: FigureEventFigureFilter): string {
    const stateIndex = entry.stateIndex !== undefined && Number.isFinite(entry.stateIndex)
        ? Math.trunc(entry.stateIndex)
        : 0

    return `${entry.figureId}:${stateIndex}`
}

export function normalizeFigureFilterList(
    entries?: FigureEventFigureFilter[],
): FigureEventFigureFilter[] | undefined {
    if (!entries?.length) {
        return undefined
    }

    const canonical = canonicalizeFigureFilterArray(entries)

    if (canonical.length === 1 && isFigureFilterAny(canonical[0].figureId)) {
        return undefined
    }

    return canonical
}

export function canonicalizeFigureFilterArray(
    entries?: FigureEventFigureFilter[],
): FigureEventFigureFilter[] {
    const normalized = (entries ?? [])
        .map(normalizeFigureFilterEntry)
        .filter((entry): entry is FigureEventFigureFilter => entry != null)

    if (normalized.length === 0) {
        return [{ figureId: FIGURE_FILTER_ANY }]
    }

    if (normalized.some(entry => isFigureFilterAny(entry.figureId))) {
        return [{ figureId: FIGURE_FILTER_ANY }]
    }

    const seen = new Set<string>()
    const concrete: FigureEventFigureFilter[] = []

    for (const entry of normalized) {
        if (!isConcreteFigureFilter(entry.figureId)) {
            continue
        }

        const key = getFigureFilterEntryKey(entry)

        if (seen.has(key)) {
            continue
        }

        seen.add(key)
        concrete.push(entry)
    }

    if (concrete.length === 0) {
        return [{ figureId: FIGURE_FILTER_ANY }]
    }

    return concrete
}

export function getEffectiveFigureFilters(
    entries?: FigureEventFigureFilter[],
): FigureEventFigureFilter[] | undefined {
    const canonical = canonicalizeFigureFilterArray(entries)

    if (canonical.length === 1 && isFigureFilterAny(canonical[0].figureId)) {
        return undefined
    }

    return canonical
}

export function setFigureFilterArrayAll(): FigureEventFigureFilter[] {
    return [{ figureId: FIGURE_FILTER_ANY }]
}

export function toggleFigureStateInFilterArray(
    entries: FigureEventFigureFilter[] | undefined,
    figureId: FigureId,
    stateIndex = 0,
): FigureEventFigureFilter[] {
    if (!isConcreteFigureFilter(figureId)) {
        return canonicalizeFigureFilterArray(entries)
    }

    const current = canonicalizeFigureFilterArray(entries)
    const normalizedStateIndex = Math.max(0, Math.trunc(stateIndex))
    const nextEntry: FigureEventFigureFilter = {
        figureId,
        stateIndex: normalizedStateIndex,
    }
    const nextKey = getFigureFilterEntryKey(nextEntry)
    const existingIndex = current.findIndex(entry => getFigureFilterEntryKey(entry) === nextKey)

    if (existingIndex >= 0) {
        return canonicalizeFigureFilterArray(
            current.filter((_, index) => index !== existingIndex),
        )
    }

    if (current.length === 1 && isFigureFilterAny(current[0].figureId)) {
        return [nextEntry]
    }

    return canonicalizeFigureFilterArray([...current, nextEntry])
}

export function removeFigureFromFilterArray(
    entries: FigureEventFigureFilter[] | undefined,
    figureId: FigureId,
): FigureEventFigureFilter[] {
    if (!isConcreteFigureFilter(figureId)) {
        return canonicalizeFigureFilterArray(entries)
    }

    const current = canonicalizeFigureFilterArray(entries)

    return canonicalizeFigureFilterArray(
        current.filter(entry => entry.figureId !== figureId),
    )
}

/** @deprecated use toggleFigureStateInFilterArray */
export function toggleFigureInFilterArray(
    entries: FigureEventFigureFilter[] | undefined,
    figureId: FigureId,
    stateIndex?: number,
): FigureEventFigureFilter[] {
    return toggleFigureStateInFilterArray(entries, figureId, stateIndex ?? 0)
}

/** @deprecated use toggleFigureStateInFilterArray */
export function updateFigureStateInFilterArray(
    entries: FigureEventFigureFilter[] | undefined,
    figureId: FigureId,
    stateIndex: number,
): FigureEventFigureFilter[] {
    const current = canonicalizeFigureFilterArray(entries)
    const withoutFigure = current.filter(entry => entry.figureId !== figureId)

    return toggleFigureStateInFilterArray(withoutFigure, figureId, stateIndex)
}

export function migrateLegacyFigureFilterList(
    legacyFigureId?: FigureId,
    legacyStateIndex?: number,
): FigureEventFigureFilter[] | undefined {
    const figureId = normalizeStoredFigureFilterId(legacyFigureId)

    if (!figureId) {
        return undefined
    }

    const entry: FigureEventFigureFilter = { figureId }

    if (legacyStateIndex !== undefined && Number.isFinite(legacyStateIndex)) {
        entry.stateIndex = Math.max(0, Math.trunc(legacyStateIndex))
    }

    return [entry]
}

export function resolveFigureFilterList(
    entries?: FigureEventFigureFilter[],
    legacyFigureId?: FigureId,
    legacyStateIndex?: number,
): FigureEventFigureFilter[] | undefined {
    if (entries?.length) {
        return canonicalizeFigureFilterArray(entries)
    }

    const migrated = migrateLegacyFigureFilterList(legacyFigureId, legacyStateIndex)

    if (!migrated) {
        return [{ figureId: FIGURE_FILTER_ANY }]
    }

    return canonicalizeFigureFilterArray(migrated)
}

export function matchesFigureFilterList(
    filters: FigureEventFigureFilter[] | undefined,
    actualFigureId: FigureId,
    actualStateIndex?: number,
): boolean {
    const effective = getEffectiveFigureFilters(filters)

    if (!effective?.length) {
        return true
    }

    if (effective.some(entry => isFigureFilterAny(entry.figureId))) {
        return true
    }

    if (effective.length === 1 && isFigureFilterNone(effective[0].figureId)) {
        return false
    }

    return effective.some(entry => {
        if (isFigureFilterNone(entry.figureId)) {
            return false
        }

        if (!matchesFigureFilter(entry.figureId, actualFigureId)) {
            return false
        }

        if (entry.stateIndex !== undefined) {
            return actualStateIndex === entry.stateIndex
        }

        return true
    })
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
