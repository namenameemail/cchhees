import { FigureEventRule } from '../types/events'
import { FigureCatalog } from '../types/figures'
import { normalizeFigureEventRules } from '../figureView'
import { BoardSlice } from './slices'

function dedupeRuleIds(rules: FigureEventRule[]): FigureEventRule[] {
    const seen = new Set<string>()

    return rules.map(rule => {
        if (!seen.has(rule.id)) {
            seen.add(rule.id)
            return rule
        }

        const nextId = crypto.randomUUID()
        seen.add(nextId)
        return { ...rule, id: nextId }
    })
}

export function collectCatalogEventRules(catalog: FigureCatalog): FigureEventRule[] {
    const collected: FigureEventRule[] = []

    for (const entry of catalog) {
        if (entry.eventRules?.length) {
            collected.push(...entry.eventRules)
        }
    }

    return dedupeRuleIds(collected)
}

export function stripCatalogEventRules(catalog: FigureCatalog): FigureCatalog {
    return catalog.map(entry => {
        if (!entry.eventRules?.length) {
            return entry
        }

        const { eventRules: _removed, ...rest } = entry
        return rest
    })
}

export function resolveBoardEventRules(
    board: BoardSlice,
    catalog: FigureCatalog,
): FigureEventRule[] {
    if (board.eventRules?.length) {
        return normalizeFigureEventRules(board.eventRules)
    }

    return normalizeFigureEventRules(collectCatalogEventRules(catalog))
}

export function migrateBoardAndCatalogEventRules(
    board: BoardSlice,
    catalog: FigureCatalog,
): { board: BoardSlice; catalog: FigureCatalog } {
    if (board.eventRules?.length) {
        return {
            board: {
                ...board,
                eventRules: normalizeFigureEventRules(board.eventRules),
            },
            catalog: stripCatalogEventRules(catalog),
        }
    }

    const migratedRules = collectCatalogEventRules(catalog)

    if (migratedRules.length === 0) {
        return { board, catalog: stripCatalogEventRules(catalog) }
    }

    return {
        board: {
            ...board,
            eventRules: normalizeFigureEventRules(migratedRules),
        },
        catalog: stripCatalogEventRules(catalog),
    }
}
