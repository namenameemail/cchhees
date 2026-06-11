import { FigureCatalog, FigureId } from '../types/figures'
import { FiguresSlice } from './slices'

export function getFigureCatalogIds(catalog: FigureCatalog): Set<FigureId> {
    return new Set(catalog.map(entry => entry.id))
}

export function removeFigureFromBoard(figures: FiguresSlice, figureId: FigureId): FiguresSlice {
    const figuresByCoord: Record<string, FigureId> = {}

    for (const [key, id] of Object.entries(figures.figuresByCoord)) {
        if (id !== figureId) {
            figuresByCoord[key] = id
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(id => id !== figureId),
    }
}

export function pruneFigureReferences(figures: FiguresSlice, catalog: FigureCatalog): FiguresSlice {
    const validIds = getFigureCatalogIds(catalog)
    const figuresByCoord: Record<string, FigureId> = {}

    for (const [key, id] of Object.entries(figures.figuresByCoord)) {
        if (validIds.has(id)) {
            figuresByCoord[key] = id
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(id => validIds.has(id)),
    }
}
