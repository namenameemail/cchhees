import { FigureCatalog, FigureId, FigurePlacement } from '../types/figures'
import { cloneFigurePlacement } from '../figureView'
import { FiguresSlice } from './slices'

export function getFigureCatalogIds(catalog: FigureCatalog): Set<FigureId> {
    return new Set(catalog.map(entry => entry.id))
}

export function removeFigureFromBoard(figures: FiguresSlice, figureId: FigureId): FiguresSlice {
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        if (placement.figureId !== figureId) {
            figuresByCoord[key] = placement
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(placement => placement.figureId !== figureId),
    }
}

export function pruneFigureReferences(figures: FiguresSlice, catalog: FigureCatalog): FiguresSlice {
    const validIds = getFigureCatalogIds(catalog)
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        if (validIds.has(placement.figureId)) {
            figuresByCoord[key] = placement
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(placement => validIds.has(placement.figureId)),
    }
}

export function cloneFiguresSlicePlacements(figures: FiguresSlice): FiguresSlice {
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        figuresByCoord[key] = cloneFigurePlacement(placement)
    }

    return {
        figuresByCoord,
        tray: figures.tray.map(cloneFigurePlacement),
    }
}
