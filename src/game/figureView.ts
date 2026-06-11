import { FigureSigns } from './constants'
import { getDefaultSvgCellParams } from './cellSvgSize'
import {
    FigureCatalog,
    FigureDefinition,
    FigureDefinitions,
    FigureDisplayType,
    FigureId,
    FigureTypes,
    FigureViewParams,
} from './types/figures'

export const DEFAULT_FIGURE_FONT_SIZE = 26
export const DEFAULT_PAWN_SYMBOL = '♙'

export function createPawnFigureViewParams(): FigureViewParams {
    return {
        displayType: FigureDisplayType.symbol,
        symbol: DEFAULT_PAWN_SYMBOL,
        fontSize: DEFAULT_FIGURE_FONT_SIZE,
        fontAssetId: null,
        ...getDefaultSvgCellParams(),
        assetId: null,
    }
}

export function getLegacySymbolForId(id: FigureId): string | undefined {
    return (FigureSigns as Record<string, string>)[id]
}

export function getDefaultFigureViewParams(legacyId?: FigureId): FigureViewParams {
    const legacySymbol = legacyId ? getLegacySymbolForId(legacyId) : undefined

    return {
        ...createPawnFigureViewParams(),
        symbol: legacySymbol ?? DEFAULT_PAWN_SYMBOL,
    }
}

export function createNewFigureDefinition(): FigureDefinition {
    return {
        id: crypto.randomUUID(),
        viewParams: createPawnFigureViewParams(),
    }
}

export function createDefaultFigureCatalog(): FigureCatalog {
    return Object.values(FigureTypes).map(id => ({
        id,
        viewParams: getDefaultFigureViewParams(id),
    }))
}

export function normalizeFigureDefinition(entry: FigureDefinition): FigureDefinition {
    const defaults = getDefaultFigureViewParams(entry.id)

    return {
        id: entry.id,
        viewParams: {
            ...defaults,
            ...entry.viewParams,
            symbol: entry.viewParams.symbol?.trim() || defaults.symbol,
            displayType: entry.viewParams.displayType ?? FigureDisplayType.symbol,
        },
    }
}

export function normalizeFigureCatalog(catalog?: FigureCatalog): FigureCatalog {
    if (!catalog?.length) {
        return createDefaultFigureCatalog()
    }

    const seen = new Set<FigureId>()

    return catalog
        .filter(entry => {
            if (!entry?.id || seen.has(entry.id)) {
                return false
            }
            seen.add(entry.id)
            return true
        })
        .map(normalizeFigureDefinition)
}

export function migrateToFigureCatalog(state: {
    figureCatalog?: FigureCatalog
    figureDefinitions?: FigureDefinitions
}): FigureCatalog {
    if (state.figureCatalog?.length) {
        return normalizeFigureCatalog(state.figureCatalog)
    }

    if (state.figureDefinitions) {
        return normalizeFigureCatalog(
            Object.entries(state.figureDefinitions).map(([id, viewParams]) => ({
                id,
                viewParams: viewParams ?? createPawnFigureViewParams(),
            })),
        )
    }

    return createDefaultFigureCatalog()
}

export function getFigureCatalogMap(catalog: FigureCatalog): Map<FigureId, FigureDefinition> {
    return new Map(catalog.map(entry => [entry.id, entry]))
}

export function resolveFigureViewParams(
    figureId: FigureId,
    catalog?: FigureCatalog,
): FigureViewParams {
    const entry = catalog?.find(item => item.id === figureId)

    if (!entry) {
        return getDefaultFigureViewParams(figureId)
    }

    return normalizeFigureDefinition(entry).viewParams
}

export function getFigureSymbol(figureId: FigureId, viewParams: FigureViewParams): string {
    return viewParams.symbol?.trim()
        || getLegacySymbolForId(figureId)
        || DEFAULT_PAWN_SYMBOL
}

export function isFigureImageMode(viewParams: FigureViewParams): boolean {
    return viewParams.displayType === FigureDisplayType.image && viewParams.assetId != null
}
