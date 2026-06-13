import { FigureSigns } from './constants'
import { getDefaultSvgCellParams, normalizeSvgCellParams } from './cellSvgSize'
import { getDefaultFigureTextShadowParams } from './figureTextShadow'
import { getDefaultFigureStrokeParams, resolveFigureStrokeWidth } from './figureStroke'
import {
    FigureCatalog,
    FigureDefinition,
    FigureDefinitions,
    FigureId,
    FigureMoveRule,
    FigureState,
    FigureTypes,
    FigureViewParams,
    LegacyFigureDefinition,
} from './types/figures'

export const DEFAULT_FIGURE_FONT_SIZE = 26
export const DEFAULT_PAWN_SYMBOL = '♙'

export function createPawnFigureViewParams(): FigureViewParams {
    return {
        symbol: DEFAULT_PAWN_SYMBOL,
        fontSize: DEFAULT_FIGURE_FONT_SIZE,
        fontAssetId: null,
        ...getDefaultSvgCellParams(),
        ...getDefaultFigureTextShadowParams(),
        ...getDefaultFigureStrokeParams(),
        assetId: null,
        borderRadius: 0,
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

export function createDefaultFigureState(figureId?: FigureId): FigureState {
    return {
        viewParams: getDefaultFigureViewParams(figureId),
        moveRules: [],
        jumpOverPieces: false,
    }
}

export function cloneFigureState(state: FigureState): FigureState {
    return {
        viewParams: { ...state.viewParams },
        moveRules: state.moveRules ? state.moveRules.map(rule => ({ ...rule })) : [],
        jumpOverPieces: state.jumpOverPieces === true,
    }
}

export function createNewFigureDefinition(): FigureDefinition {
    return {
        id: crypto.randomUUID(),
        states: [createDefaultFigureState()],
    }
}

export function normalizeFigureMoveRule(rule: FigureMoveRule): FigureMoveRule | null {
    const x = Math.trunc(rule.x)
    const y = Math.trunc(rule.y)

    if (x === 0 && y === 0) {
        return null
    }

    const n = rule.n === undefined ? 1 : Math.trunc(rule.n)

    return { x, y, n }
}

export function normalizeFigureMoveRules(rules?: FigureMoveRule[]): FigureMoveRule[] {
    if (!rules?.length) {
        return []
    }

    return rules
        .map(normalizeFigureMoveRule)
        .filter((rule): rule is FigureMoveRule => rule !== null)
}

export function hasFigureMoveRules(state: Pick<FigureState, 'moveRules'>): boolean {
    return normalizeFigureMoveRules(state.moveRules).length > 0
}

export function createDefaultFigureCatalog(): FigureCatalog {
    return Object.values(FigureTypes).map(id => ({
        id,
        states: [createDefaultFigureState(id)],
    }))
}

export function normalizeFigureState(state: FigureState, figureId: FigureId): FigureState {
    const defaults = getDefaultFigureViewParams(figureId)
    const { displayType: _displayType, ...viewParams } = state.viewParams as FigureViewParams & {
        displayType?: string
    }

    return {
        viewParams: normalizeSvgCellParams({
            ...defaults,
            ...viewParams,
            symbol: viewParams.symbol?.trim() || defaults.symbol,
            assetId: typeof viewParams.assetId === 'number' ? viewParams.assetId : null,
            fontAssetId: viewParams.fontAssetId ?? null,
            textShadowEnabled: viewParams.textShadowEnabled === true,
            textShadowColor: viewParams.textShadowColor?.trim() || defaults.textShadowColor,
            borderRadius: resolveFigureBorderRadius(viewParams),
            strokeWidth: resolveFigureStrokeWidth(viewParams),
            strokeColor: viewParams.strokeColor?.trim() || defaults.strokeColor,
            strokeDasharray: viewParams.strokeDasharray?.trim() || undefined,
        }),
        moveRules: normalizeFigureMoveRules(state.moveRules),
        jumpOverPieces: state.jumpOverPieces === true,
    }
}

function extractStatesFromEntry(
    entry: FigureDefinition | LegacyFigureDefinition,
): FigureState[] {
    if ('states' in entry && entry.states?.length) {
        return entry.states
    }

    const legacy = entry as LegacyFigureDefinition

    if (legacy.viewParams) {
        return [{
            viewParams: legacy.viewParams,
            moveRules: legacy.moveRules,
            jumpOverPieces: legacy.jumpOverPieces,
        }]
    }

    return [createDefaultFigureState(entry.id)]
}

export function normalizeFigureDefinition(
    entry: FigureDefinition | LegacyFigureDefinition,
): FigureDefinition {
    const states = extractStatesFromEntry(entry)
        .map(state => normalizeFigureState(state, entry.id))

    return {
        id: entry.id,
        states: states.length > 0 ? states : [createDefaultFigureState(entry.id)],
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
                states: [{
                    viewParams: viewParams ?? createPawnFigureViewParams(),
                    moveRules: [],
                    jumpOverPieces: false,
                }],
            })),
        )
    }

    return createDefaultFigureCatalog()
}

export function getFigureCatalogMap(catalog: FigureCatalog): Map<FigureId, FigureDefinition> {
    return new Map(catalog.map(entry => [entry.id, entry]))
}

export function resolveFigureState(
    definition: FigureDefinition,
    stateIndex = 0,
): FigureState {
    const states = definition.states

    if (!states.length) {
        return createDefaultFigureState(definition.id)
    }

    const index = Number.isFinite(stateIndex)
        ? Math.min(Math.max(0, Math.trunc(stateIndex)), states.length - 1)
        : 0

    return states[index]
}

export function resolveFigurePlayState(definition: FigureDefinition): FigureState {
    return resolveFigureState(definition, 0)
}

export function resolveFigureViewParams(
    figureId: FigureId,
    catalog?: FigureCatalog,
    stateIndex = 0,
): FigureViewParams {
    return resolveFigureState(resolveFigureDefinition(figureId, catalog), stateIndex).viewParams
}

export function resolveFigureDefinition(
    figureId: FigureId,
    catalog?: FigureCatalog,
): FigureDefinition {
    const entry = catalog?.find(item => item.id === figureId)

    if (!entry) {
        return {
            id: figureId,
            states: [createDefaultFigureState(figureId)],
        }
    }

    return normalizeFigureDefinition(entry)
}

export function getFigureSymbol(figureId: FigureId, viewParams: FigureViewParams): string {
    return viewParams.symbol?.trim()
        || getLegacySymbolForId(figureId)
        || DEFAULT_PAWN_SYMBOL
}

export function hasFigureImage(viewParams: FigureViewParams): boolean {
    return viewParams.assetId != null
}

export function resolveFigureBorderRadius(viewParams: FigureViewParams): number {
    const value = viewParams.borderRadius

    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

export function resolveCollabStateIndex(stateIndex?: number): number {
    return Number.isFinite(stateIndex) ? Math.max(0, Math.trunc(stateIndex!)) : 0
}

export function updateFigureCatalogStateAtIndex(
    catalog: FigureCatalog,
    figureId: FigureId,
    stateIndex: number,
    updater: (state: FigureState) => FigureState,
): FigureCatalog {
    return catalog.map(entry => {
        if (entry.id !== figureId) {
            return entry
        }

        const index = Math.min(Math.max(0, Math.trunc(stateIndex)), entry.states.length - 1)
        const nextStates = [...entry.states]
        nextStates[index] = updater(nextStates[index])

        return { ...entry, states: nextStates }
    })
}
