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
    FigurePlacement,
    FigurePlacementInput,
    FigureState,
    FigureTypes,
    FigureViewParams,
    LegacyFigureDefinition,
} from './types/figures'
import { CellCoord, coordKey } from './types/coords'
import { resolveFigureFilterList } from './figureFilter'
import { migrateLegacyFigureAreaCells, normalizeFigureAreaCells } from './figureAreaCells'
import {
    DisplaceFigureActionParams,
    FigureEventAreaCell,
    FigureEventParamsAreaEnteredBy,
    FigureEventParamsEnterFigureArea,
    FigureEventParamsStepOnFigure,
    FigureEventParamsSteppedOnBy,
    FigureEventRule,
    FigureEventType,
    GameAction,
    GameActionType,
    GameActionTarget,
    SetOtherStateActionParams,
    SetSelfStateActionParams,
    SpawnFigureActionParams,
    StackPositionMode,
    StackTargetMode,
    StepCause,
} from './types/events'

const VALID_STACK_POSITION_MODES = new Set<StackPositionMode>([
    'any', 'top', 'bottom', 'fromTop', 'fromBottom',
])

const VALID_STACK_TARGET_MODES = new Set<StackTargetMode>([
    'any', 'top', 'bottom', 'fromTop', 'fromBottom', 'all',
])

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
        eventRules: [],
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

const VALID_ACTION_TARGETS = new Set<GameActionTarget>(['steppedOn', 'steppedBy', 'areaAnchor'])
const VALID_STEP_CAUSES = new Set<StepCause>(['any', 'manual', 'displacement'])

export function normalizeFigureEventParamsStepOnFigure(
    params?: FigureEventParamsStepOnFigure,
): FigureEventParamsStepOnFigure {
    const normalized: FigureEventParamsStepOnFigure = {}
    const cause = params?.cause

    const targetFigures = resolveFigureFilterList(
        params?.targetFigures,
        params?.targetFigureId,
        params?.targetStateIndex,
    )

    normalized.targetFigures = targetFigures

    if (cause && VALID_STEP_CAUSES.has(cause)) {
        normalized.cause = cause
    }

    const stackTarget = params?.stackTarget
    if (stackTarget && VALID_STACK_TARGET_MODES.has(stackTarget)) {
        normalized.stackTarget = stackTarget
    } else {
        normalized.stackTarget = 'all'
    }

    if (params?.stackIndex !== undefined && Number.isFinite(params.stackIndex)) {
        normalized.stackIndex = Math.max(0, Math.trunc(params.stackIndex))
    }

    return normalized
}

export function normalizeFigureEventParamsSteppedOnBy(
    params?: FigureEventParamsSteppedOnBy,
): FigureEventParamsSteppedOnBy {
    const normalized: FigureEventParamsSteppedOnBy = {}

    const stepperFigures = resolveFigureFilterList(
        params?.stepperFigures,
        params?.stepperFigureId,
        params?.stepperStateIndex,
    )

    normalized.stepperFigures = stepperFigures

    const cause = params?.cause
    if (cause && VALID_STEP_CAUSES.has(cause)) {
        normalized.cause = cause
    }

    const stackPosition = params?.stackPosition
    if (stackPosition && VALID_STACK_POSITION_MODES.has(stackPosition)) {
        normalized.stackPosition = stackPosition
    } else {
        normalized.stackPosition = 'any'
    }

    if (params?.stackIndex !== undefined && Number.isFinite(params.stackIndex)) {
        normalized.stackIndex = Math.max(0, Math.trunc(params.stackIndex))
    }

    return normalized
}

export function normalizeFigureEventParamsEnterFigureArea(
    params?: FigureEventParamsEnterFigureArea,
): FigureEventParamsEnterFigureArea {
    const anchorFigures = resolveFigureFilterList(
        params?.anchorFigures,
        params?.figureId,
    )

    let cells = normalizeFigureAreaCells(params?.cells)

    if (cells.length === 0 && (params?.halfWidth !== undefined || params?.halfHeight !== undefined)) {
        cells = migrateLegacyFigureAreaCells(params?.halfWidth, params?.halfHeight)
    }

    return {
        anchorFigures,
        cells,
        includePassive: params?.includePassive !== false,
    }
}

export function normalizeFigureEventParamsAreaEnteredBy(
    params?: FigureEventParamsAreaEnteredBy,
): FigureEventParamsAreaEnteredBy {
    const normalized: FigureEventParamsAreaEnteredBy = {}

    const entererFigures = resolveFigureFilterList(params?.entererFigures)
    normalized.entererFigures = entererFigures
    normalized.cells = normalizeFigureAreaCells(params?.cells)

    const cause = params?.cause
    if (cause && VALID_STEP_CAUSES.has(cause)) {
        normalized.cause = cause
    }

    normalized.includePassive = params?.includePassive !== false

    return normalized
}

export function normalizeGameAction(action: GameAction): GameAction | null {
    if (!action?.type) {
        return null
    }

    switch (action.type) {
        case GameActionType.spawnFigure: {
            const params = action.params as SpawnFigureActionParams
            if (typeof params.figureId !== 'string' || !params.figureId.trim()) {
                return null
            }

            const x = Math.trunc(params.x)
            const y = Math.trunc(params.y)

            if (!Number.isFinite(x) || !Number.isFinite(y) || x < 1 || y < 1) {
                return null
            }

            return {
                type: GameActionType.spawnFigure,
                params: {
                    figureId: params.figureId.trim(),
                    x,
                    y,
                    stateIndex: Math.max(0, Math.trunc(params.stateIndex ?? 0)),
                },
            }
        }
        case GameActionType.setSelfState: {
            const params = action.params as SetSelfStateActionParams
            return {
                type: GameActionType.setSelfState,
                params: {
                    stateIndex: Math.max(0, Math.trunc(params.stateIndex)),
                },
            }
        }
        case GameActionType.setOtherState: {
            const params = action.params as SetOtherStateActionParams
            const target = params?.target
            const resolvedTarget = target && VALID_ACTION_TARGETS.has(target)
                ? target
                : 'steppedOn'

            return {
                type: GameActionType.setOtherState,
                params: {
                    stateIndex: Math.max(0, Math.trunc(params?.stateIndex ?? 0)),
                    target: resolvedTarget,
                },
            }
        }
        case GameActionType.moveToTray:
            return {
                type: GameActionType.moveToTray,
                params: {},
            }
        case GameActionType.displaceFigure: {
            const params = action.params as DisplaceFigureActionParams
            if (!params) {
                return null
            }

            const dx = Number.isFinite(params.dx) ? Math.trunc(params.dx) : 0
            const dy = Number.isFinite(params.dy) ? Math.trunc(params.dy) : 0

            if (dx === 0 && dy === 0) {
                return null
            }

            return {
                type: GameActionType.displaceFigure,
                params: { dx, dy },
            }
        }
        default:
            return null
    }
}

function normalizeFigureEventParams(
    type: FigureEventType,
    params?: FigureEventRule['params'],
): FigureEventRule['params'] {
    if (type === FigureEventType.steppedOnBy) {
        return normalizeFigureEventParamsSteppedOnBy(params as FigureEventParamsSteppedOnBy | undefined)
    }

    if (type === FigureEventType.stepOnFigure) {
        return normalizeFigureEventParamsStepOnFigure(params as FigureEventParamsStepOnFigure | undefined)
    }

    if (type === FigureEventType.enterFigureArea) {
        return normalizeFigureEventParamsEnterFigureArea(params as FigureEventParamsEnterFigureArea | undefined)
    }

    if (type === FigureEventType.areaEnteredBy) {
        return normalizeFigureEventParamsAreaEnteredBy(params as FigureEventParamsAreaEnteredBy | undefined)
    }

    return params
}

export function normalizeFigureEventRule(rule: FigureEventRule): FigureEventRule | null {
    if (!rule?.id || !rule.type || !Object.values(FigureEventType).includes(rule.type)) {
        return null
    }

    const actions = (rule.actions ?? [])
        .map(normalizeGameAction)
        .filter((action): action is GameAction => action !== null)

    if (actions.length === 0) {
        return null
    }

    return {
        id: rule.id,
        type: rule.type,
        params: normalizeFigureEventParams(rule.type, rule.params),
        actions,
    }
}

export function normalizeFigureEventRules(rules?: FigureEventRule[]): FigureEventRule[] {
    if (!rules?.length) {
        return []
    }

    return rules
        .map(normalizeFigureEventRule)
        .filter((rule): rule is FigureEventRule => rule !== null)
}

export function normalizeFigureDefinition(
    entry: FigureDefinition | LegacyFigureDefinition,
): FigureDefinition {
    const states = extractStatesFromEntry(entry)
        .map(state => normalizeFigureState(state, entry.id))

    return {
        id: entry.id,
        states: states.length > 0 ? states : [createDefaultFigureState(entry.id)],
        eventRules: normalizeFigureEventRules(
            'eventRules' in entry ? entry.eventRules : undefined,
        ),
    }
}

export function normalizeFigureCatalog(catalog?: FigureCatalog): FigureCatalog {
    if (!Array.isArray(catalog) || !catalog.length) {
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

export function createPlacementInstanceId(): string {
    return crypto.randomUUID()
}

export function placementsMatch(a: FigurePlacement, b: FigurePlacement): boolean {
    return a.instanceId === b.instanceId
}

export function ensurePlacementInstanceId(
    placement: Omit<FigurePlacement, 'instanceId'> & { instanceId?: string },
): FigurePlacement {
    return {
        instanceId: placement.instanceId?.trim() || createPlacementInstanceId(),
        figureId: placement.figureId,
        ...(placement.stateIndex !== undefined ? { stateIndex: placement.stateIndex } : {}),
    }
}

export function normalizeFigurePlacement(raw: FigureId | FigurePlacementInput): FigurePlacement {
    if (typeof raw === 'string') {
        return createFigurePlacement(raw)
    }

    return ensurePlacementInstanceId({
        instanceId: raw.instanceId,
        figureId: raw.figureId,
        stateIndex: raw.stateIndex,
    })
}

export function resolvePlacementStateIndex(placement: FigurePlacement): number {
    const value = placement.stateIndex

    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.trunc(value))
        : 0
}

export function cloneFigurePlacement(placement: FigurePlacement): FigurePlacement {
    return {
        instanceId: placement.instanceId,
        figureId: placement.figureId,
        stateIndex: placement.stateIndex,
    }
}

export function createFigurePlacement(figureId: FigureId, stateIndex?: number): FigurePlacement {
    const base: FigurePlacement = {
        instanceId: createPlacementInstanceId(),
        figureId,
    }

    return stateIndex === undefined
        ? base
        : { ...base, stateIndex: resolveCollabStateIndex(stateIndex) }
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
