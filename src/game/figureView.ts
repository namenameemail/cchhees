import { FigureSigns } from './constants'
import { getDefaultSvgCellParams, normalizeSvgCellParams } from './cellSvgSize'
import { getDefaultFigureTextShadowParams } from './figureTextShadow'
import { getDefaultFigureStrokeParams, resolveFigureStrokeWidth } from './figureStroke'
import {
    FigureCatalog,
    FigureDefinition,
    FigureDefinitions,
    FigureId,
    FigureMoveDirection,
    FigureMoveRule,
    FigureMoveVariant,
    FigurePlacement,
    FigurePlacementInput,
    FigureState,
    FigureTeams,
    FigureTypes,
    FigureViewParams,
    LegacyFigureDefinition,
} from './types/figures'
import { BoardParameters } from './types/boardParameters'
import {
    cloneMoveRule,
    createDefaultMoveRule,
    migrateFigureMoveRulesInput,
} from './migrateFigureMoveRules'
import { CellCoord, coordKey } from './types/coords'
import { resolveFigureFilterList, canonicalizeFigureFilterArray, normalizeFigureFilterEntry, FIGURE_FILTER_NONE, canonicalizeConditionSubjectEntries, FIGURE_SUBJECT_MOVED, FIGURE_SUBJECT_STEPPED_ON } from './figureFilter'
import { resolveTeamMoveDirection } from './figureTeams'
import {
    DisplaceFigureActionParams,
    FigureEventAreaCell,
    FigureEventCondition,
    FigureEventConditionSubject,
    LegacyFigureEventConditionSubject,
    FigureEventConditionType,
    FigureEventFigureFilter,
    FigureEventCoord,
    FigureEventParamsAreaEnteredBy,
    FigureEventParamsEnterFigureArea,
    FigureEventParamsOnMove,
    FigureEventParamsStepOnFigure,
    FigureEventParamsSteppedOnBy,
    LegacyFigureEventParamsSteppedOnBy,
    FigureEventRule,
    FigureEventType,
    GameAction,
    GameActionType,
    GameActionTarget,
    MoveToCellActionParams,
    PersistedFigureEventRule,
    SetOtherStateActionParams,
    SetSelfStateActionParams,
    SpawnFigureActionParams,
    StackPositionMode,
    StackTargetMode,
    StepCause,
} from './types/events'
import { migrateFigureEventRule } from './events/migrateEventRules'
import {
    migrateLegacyFigureAreaCells,
    normalizeFigureAreaCells,
} from './figureAreaCells'
import {
    logFigureConditionDropped,
    logFigureConditionsNormalize,
} from './figureEventRulesDebugLog'

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
    }
}

function normalizeMoveVariant(variant: FigureMoveVariant | undefined, kind: 'empty' | 'capture' | 'jumpOver'): FigureMoveVariant {
    const defaults = createDefaultMoveRule(1, 0)[kind]
    const source = variant ?? defaults
    const length = source.length === undefined ? defaults.length : Math.max(0, Math.trunc(source.length))

    return {
        enabled: source.enabled === true,
        length,
        ...(kind === 'empty' && source.emptyPath === true ? { emptyPath: true } : {}),
        ...(kind === 'capture' || kind === 'jumpOver'
            ? { allowOwnTeam: source.allowOwnTeam === true }
            : {}),
        conditions: source.conditions ?? [],
    }
}

export function normalizeFigureMoveRule(rule: FigureMoveRule): FigureMoveRule | null {
    const x = Math.trunc(rule.x)
    const y = Math.trunc(rule.y)

    if (x === 0 && y === 0) {
        return null
    }

    return {
        x,
        y,
        empty: normalizeMoveVariant(rule.empty, 'empty'),
        capture: normalizeMoveVariant(rule.capture, 'capture'),
        jumpOver: normalizeMoveVariant(rule.jumpOver, 'jumpOver'),
    }
}

export function normalizeFigureMoveRules(
    rules?: FigureMoveRule[],
    stateFlags?: { canStepOnOwnTeam?: boolean; canJumpOverOwnTeam?: boolean },
): FigureMoveRule[] {
    if (!rules?.length) {
        return []
    }

    const migrated = migrateFigureMoveRulesInput(rules, stateFlags)
    const deduped = new Map<string, FigureMoveRule>()

    for (const rule of migrated) {
        const normalized = normalizeFigureMoveRule(rule)

        if (!normalized) {
            continue
        }

        deduped.set(`${normalized.x},${normalized.y}`, normalized)
    }

    return [...deduped.values()].sort((left, right) => (left.y - right.y) || (left.x - right.x))
}

export function createNewFigureDefinition(): FigureDefinition {
    return {
        id: crypto.randomUUID(),
        states: [createDefaultFigureState()],
    }
}

export function cloneFigureState(state: FigureState): FigureState {
    return {
        viewParams: { ...state.viewParams },
        moveRules: state.moveRules ? state.moveRules.map(cloneMoveRule) : [],
    }
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
        moveRules: normalizeFigureMoveRules(state.moveRules, {
            canStepOnOwnTeam: state.canStepOnOwnTeam,
            canJumpOverOwnTeam: state.canJumpOverOwnTeam,
        }),
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
            moveRules: legacy.moveRules as FigureState['moveRules'],
        }]
    }

    return [createDefaultFigureState(entry.id)]
}


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
    params?: LegacyFigureEventParamsSteppedOnBy,
): LegacyFigureEventParamsSteppedOnBy {
    const normalized: LegacyFigureEventParamsSteppedOnBy = {}
    const legacyParams = params as LegacyFigureEventParamsSteppedOnBy | undefined

    const stepperFigures = resolveFigureFilterList(
        legacyParams?.stepperFigures,
        legacyParams?.stepperFigureId,
        legacyParams?.stepperStateIndex,
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

function migrateSetOtherStateTargetToEntries(
    target: GameActionTarget | undefined,
    ownerFigureId?: FigureId,
): FigureEventFigureFilter[] {
    switch (target) {
        case 'steppedBy':
            return [{ figureId: FIGURE_SUBJECT_MOVED }]
        case 'areaAnchor':
            return ownerFigureId
                ? [{ figureId: ownerFigureId }]
                : [{ figureId: FIGURE_SUBJECT_MOVED }]
        case 'steppedOn':
        default:
            return [{ figureId: FIGURE_SUBJECT_STEPPED_ON }]
    }
}

function normalizeGameActionSubject(
    action: GameAction,
    eventType?: FigureEventType,
    ownerFigureId?: FigureId,
): FigureEventConditionSubject | undefined {
    if (action.type === GameActionType.spawnFigure) {
        return undefined
    }

    if (action.subject?.entries?.length) {
        return {
            entries: canonicalizeConditionSubjectEntries(action.subject.entries),
            matchMode: action.subject.matchMode === 'all' ? 'all' : 'any',
        }
    }

    if (action.type === GameActionType.setOtherState) {
        const params = action.params as SetOtherStateActionParams
        return {
            entries: canonicalizeConditionSubjectEntries(
                migrateSetOtherStateTargetToEntries(params?.target, ownerFigureId),
            ),
            matchMode: 'any',
        }
    }

    const entries = eventType === FigureEventType.steppedOnBy
        ? [{ figureId: FIGURE_SUBJECT_STEPPED_ON }]
        : [{ figureId: FIGURE_SUBJECT_MOVED }]

    return {
        entries: canonicalizeConditionSubjectEntries(entries),
        matchMode: 'any',
    }
}

export function normalizeGameAction(
    action: GameAction,
    context?: { eventType?: FigureEventType; ownerFigureId?: FigureId },
): GameAction | null {
    if (!action?.type) {
        return null
    }

    const subject = normalizeGameActionSubject(
        action,
        context?.eventType,
        context?.ownerFigureId,
    )

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
        case GameActionType.setSelfState:
        case GameActionType.setOtherState: {
            const params = action.params as SetSelfStateActionParams & SetOtherStateActionParams
            return {
                type: GameActionType.setSelfState,
                subject,
                params: {
                    stateIndex: Math.max(0, Math.trunc(params?.stateIndex ?? 0)),
                },
            }
        }
        case GameActionType.moveToTray:
            return {
                type: GameActionType.moveToTray,
                subject,
                params: {},
            }
        case GameActionType.moveToCell: {
            const params = action.params as MoveToCellActionParams | SetSelfStateActionParams | undefined
            const hasCellParams = params != null && ('x' in params || 'y' in params)
            let x = hasCellParams && Number.isFinite(params?.x) ? Math.trunc(params.x!) : 1
            let y = hasCellParams && Number.isFinite(params?.y) ? Math.trunc(params.y!) : 1

            if (x < 1) {
                x = 1
            }

            if (y < 1) {
                y = 1
            }

            return {
                type: GameActionType.moveToCell,
                subject,
                params: { x, y },
            }
        }
        case GameActionType.displaceFigure: {
            const params = action.params as DisplaceFigureActionParams | SetSelfStateActionParams | undefined
            const hasDisplaceParams = params != null && ('dx' in params || 'dy' in params)
            let dx = hasDisplaceParams && Number.isFinite(params?.dx) ? Math.trunc(params.dx!) : 1
            let dy = hasDisplaceParams && Number.isFinite(params?.dy) ? Math.trunc(params.dy!) : 0

            if (dx === 0 && dy === 0) {
                dx = 1
            }

            return {
                type: GameActionType.displaceFigure,
                subject,
                params: { dx, dy },
            }
        }
        default:
            return null
    }
}

const VALID_CONDITION_MATCH_MODES = new Set(['any', 'all'])

const VALID_CONDITION_TYPES = new Set<string>(Object.values(FigureEventConditionType))

function migrateLegacyConditionSubject(
    subject?: LegacyFigureEventConditionSubject | FigureEventCondition['subject'],
): FigureEventCondition['subject'] | null {
    if (!subject) {
        return null
    }

    if ('entries' in subject && Array.isArray(subject.entries)) {
        return null
    }

    const legacy = subject as LegacyFigureEventConditionSubject

    if (!legacy.kind) {
        return null
    }

    if (legacy.kind === 'moved') {
        return {
            entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
            matchMode: 'any',
        }
    }

    if (legacy.kind === 'steppedOn') {
        return {
            entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
            matchMode: 'any',
        }
    }

    if (legacy.kind === 'filtered') {
        const filter = normalizeFigureFilterEntry(legacy.filter)

        return {
            entries: filter ? [filter] : [{ figureId: FIGURE_SUBJECT_MOVED }],
            matchMode: 'any',
        }
    }

    return null
}

function normalizeFigureEventConditionSubject(
    subject?: FigureEventCondition['subject'] | LegacyFigureEventConditionSubject,
): FigureEventCondition['subject'] | null {
    if (subject && 'entries' in subject && Array.isArray(subject.entries)) {
        const entries = canonicalizeConditionSubjectEntries(subject.entries)
        const matchMode = subject.matchMode && VALID_CONDITION_MATCH_MODES.has(subject.matchMode)
            ? subject.matchMode
            : 'any'

        return { entries, matchMode }
    }

    return migrateLegacyConditionSubject(subject)
}

type ConditionNormalizeFailure = {
    reason: string
}

function tryNormalizeFigureEventCondition(
    condition?: FigureEventCondition,
): { condition: FigureEventCondition } | ConditionNormalizeFailure {
    if (!condition?.type || !VALID_CONDITION_TYPES.has(condition.type)) {
        return { reason: 'invalid or missing condition type' }
    }

    const subject = normalizeFigureEventConditionSubject(condition.subject)
    if (!subject) {
        return {
            reason: 'invalid subject',
        }
    }

    const params = normalizeFigureEventConditionParams(condition.type, condition.params)
    if (params === undefined && condition.type !== FigureEventConditionType.exitedBoard) {
        return { reason: `missing or invalid params for ${condition.type}` }
    }

    return {
        condition: {
            subject,
            type: condition.type,
            ...(params !== undefined ? { params } : {}),
        },
    }
}

function normalizeFigureEventCondition(
    condition?: FigureEventCondition,
): FigureEventCondition | null {
    const result = tryNormalizeFigureEventCondition(condition)
    return 'condition' in result ? result.condition : null
}

function normalizeFigureEventConditions(
    conditions?: FigureEventCondition[],
    debugContext?: {
        figureId?: FigureId
        ruleId?: string
        ruleIndex?: number
    },
): FigureEventCondition[] {
    if (!conditions?.length) {
        return []
    }

    const normalized: FigureEventCondition[] = []

    conditions.forEach((condition, conditionIndex) => {
        const result = tryNormalizeFigureEventCondition(condition)

        if ('condition' in result) {
            normalized.push(result.condition)
            return
        }

        logFigureConditionDropped({
            figureId: debugContext?.figureId,
            ruleId: debugContext?.ruleId,
            ruleIndex: debugContext?.ruleIndex,
            conditionIndex,
            condition,
            reason: result.reason,
        })
    })

    logFigureConditionsNormalize({
        figureId: debugContext?.figureId,
        ruleId: debugContext?.ruleId,
        ruleIndex: debugContext?.ruleIndex,
        before: conditions,
        after: normalized,
    })

    return normalized
}

function normalizeFigureEventConditionParams(
    type: FigureEventConditionType,
    params?: FigureEventCondition['params'],
): FigureEventCondition['params'] | undefined {
    switch (type) {
        case FigureEventConditionType.inBoardArea:
        case FigureEventConditionType.landedInBoardArea: {
            const rect = params as { x1?: number; y1?: number; x2?: number; y2?: number } | undefined
            if (!rect) {
                return undefined
            }

            return {
                x1: Math.max(1, Math.trunc(rect.x1 ?? 1)),
                y1: Math.max(1, Math.trunc(rect.y1 ?? 1)),
                x2: Math.max(1, Math.trunc(rect.x2 ?? 1)),
                y2: Math.max(1, Math.trunc(rect.y2 ?? 1)),
            }
        }
        case FigureEventConditionType.inFigureArea:
        case FigureEventConditionType.landedInFigureArea:
            return normalizeFigureEventParamsEnterFigureArea(
                params as FigureEventParamsEnterFigureArea | undefined,
            )
        case FigureEventConditionType.figureEnteredArea: {
            const areaParams = params as { cells?: FigureEventAreaCell[]; includePassive?: boolean } | undefined
            return {
                cells: normalizeFigureAreaCells(areaParams?.cells),
                includePassive: areaParams?.includePassive !== false,
            }
        }
        case FigureEventConditionType.onCells: {
            const cellParams = params as { cells?: FigureEventCoord[]; matchMode?: 'any' | 'all' } | undefined
            const cells = (cellParams?.cells ?? [])
                .map(cell => ({
                    x: Math.max(1, Math.trunc(cell.x)),
                    y: Math.max(1, Math.trunc(cell.y)),
                }))
                .filter(cell => Number.isFinite(cell.x) && Number.isFinite(cell.y))

            if (!cells.length) {
                return undefined
            }

            return {
                cells,
                matchMode: cellParams?.matchMode === 'all' ? 'all' : 'any',
            }
        }
        case FigureEventConditionType.aboveFigures:
        case FigureEventConditionType.belowFigures:
        case FigureEventConditionType.hoppedOverFigures: {
            const listParams = params as { figures?: FigureEventFigureFilter[]; matchMode?: 'any' | 'all' } | undefined
            return {
                figures: canonicalizeFigureFilterArray(listParams?.figures),
                matchMode: listParams?.matchMode === 'all' ? 'all' : 'any',
            }
        }
        case FigureEventConditionType.isFigure:
        case FigureEventConditionType.isNotFigure: {
            const listParams = params as { figures?: FigureEventFigureFilter[] } | undefined
            return {
                figures: canonicalizeFigureFilterArray(listParams?.figures),
            }
        }
        case FigureEventConditionType.leftCell:
        case FigureEventConditionType.landedOnCell: {
            const coord = params as { x?: number; y?: number } | undefined
            if (!coord) {
                return undefined
            }

            return {
                x: Math.max(1, Math.trunc(coord.x ?? 1)),
                y: Math.max(1, Math.trunc(coord.y ?? 1)),
            }
        }
        case FigureEventConditionType.movedBy: {
            const moveParams = params as { dx?: number; dy?: number } | undefined
            return {
                dx: Math.trunc(moveParams?.dx ?? 0),
                dy: Math.trunc(moveParams?.dy ?? 0),
            }
        }
        case FigureEventConditionType.landedOnFigure: {
            const landedParams = normalizeFigureEventParamsStepOnFigure({
                targetFigures: (params as { figures?: FigureEventFigureFilter[] } | undefined)?.figures,
                stackTarget: (params as { stackTarget?: StackTargetMode } | undefined)?.stackTarget,
                stackIndex: (params as { stackIndex?: number } | undefined)?.stackIndex,
            })

            return {
                figures: landedParams.targetFigures,
                matchMode: (params as { matchMode?: 'any' | 'all' } | undefined)?.matchMode === 'all'
                    ? 'all'
                    : 'any',
                stackTarget: landedParams.stackTarget,
                ...(landedParams.stackIndex !== undefined ? { stackIndex: landedParams.stackIndex } : {}),
            }
        }
        case FigureEventConditionType.steppedOnByFigure: {
            const steppedParams = normalizeFigureEventParamsSteppedOnBy({
                stepperFigures: (params as { stepperFigures?: FigureEventFigureFilter[] } | undefined)?.stepperFigures,
            })

            return {
                stepperFigures: steppedParams.stepperFigures,
                matchMode: (params as { matchMode?: 'any' | 'all' } | undefined)?.matchMode === 'all'
                    ? 'all'
                    : 'any',
            }
        }
        case FigureEventConditionType.exitedBoard:
            return {}
        default:
            return undefined
    }
}

function normalizeFigureEventParams(
    type: FigureEventType,
    params?: FigureEventRule['params'],
): FigureEventRule['params'] {
    if (type === FigureEventType.onMove) {
        const onMoveParams = (params ?? {}) as FigureEventParamsOnMove
        const cause = onMoveParams.cause

        return cause && VALID_STEP_CAUSES.has(cause)
            ? { cause }
            : { cause: 'any' }
    }

    if (type === FigureEventType.steppedOnBy) {
        const steppedParams = (params ?? {}) as FigureEventParamsSteppedOnBy
        const normalized: FigureEventParamsSteppedOnBy = {}

        const cause = steppedParams.cause
        if (cause && VALID_STEP_CAUSES.has(cause)) {
            normalized.cause = cause
        } else {
            normalized.cause = 'any'
        }

        const stackPosition = steppedParams.stackPosition
        if (stackPosition && VALID_STACK_POSITION_MODES.has(stackPosition)) {
            normalized.stackPosition = stackPosition
        } else {
            normalized.stackPosition = 'any'
        }

        if (steppedParams.stackIndex !== undefined && Number.isFinite(steppedParams.stackIndex)) {
            normalized.stackIndex = Math.max(0, Math.trunc(steppedParams.stackIndex))
        }

        return normalized
    }

    return params ?? {}
}

export function normalizeFigureEventRule(
    rule: PersistedFigureEventRule,
    debugContext?: { figureId?: FigureId; ruleIndex?: number },
): FigureEventRule | null {
    const migrated = migrateFigureEventRule(rule)

    if (!migrated?.id || !migrated.type || !Object.values(FigureEventType).includes(migrated.type)) {
        return null
    }

    const actions = (migrated.actions ?? [])
        .map(action => normalizeGameAction(action, {
            eventType: migrated.type,
            ownerFigureId: debugContext?.figureId,
        }))
        .filter((action): action is GameAction => action !== null)

    const conditions = normalizeFigureEventConditions(migrated.conditions, {
        figureId: debugContext?.figureId,
        ruleId: migrated.id,
        ruleIndex: debugContext?.ruleIndex,
    })

    return {
        id: migrated.id,
        type: migrated.type,
        params: normalizeFigureEventParams(migrated.type, migrated.params),
        conditions,
        actions,
    }
}

export function normalizeFigureEventRules(rules?: FigureEventRule[]): FigureEventRule[] {
    if (!rules?.length) {
        return []
    }

    return rules
        .map(rule => normalizeFigureEventRule(rule))
        .filter((rule): rule is FigureEventRule => rule !== null)
}

export function normalizeFigureTeam(team: unknown): number | undefined {
    if (typeof team !== 'number' || !Number.isFinite(team)) {
        return undefined
    }

    return Math.trunc(team)
}

const VALID_MOVE_DIRECTIONS = new Set<FigureMoveDirection>(['up', 'down', 'left', 'right'])

export function normalizeFigureMoveDirection(direction: unknown): FigureMoveDirection {
    if (typeof direction === 'string' && VALID_MOVE_DIRECTIONS.has(direction as FigureMoveDirection)) {
        return direction as FigureMoveDirection
    }

    return 'up'
}

export function resolveFigureMoveDirection(entry: Pick<FigureDefinition, 'moveDirection'> | undefined): FigureMoveDirection {
    return normalizeFigureMoveDirection(entry?.moveDirection)
}

export function resolveFigureMoveDirectionFromCatalog(
    catalog: FigureCatalog,
    figureId: FigureId,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): FigureMoveDirection {
    const entry = catalog.find(item => item.id === figureId)
    const teamId = entry ? normalizeFigureTeam(entry.team) : undefined

    if (teamId !== undefined) {
        const teamDirection = resolveTeamMoveDirection(boardParameters, teamId, legacyFigureTeams)

        return teamDirection ?? 'up'
    }

    return resolveFigureMoveDirection(entry)
}

export function resolveFigureTeam(catalog: FigureCatalog, figureId: FigureId): number | undefined {
    const entry = catalog.find(item => item.id === figureId)

    if (!entry) {
        return undefined
    }

    return normalizeFigureTeam(entry.team)
}

export function areSameFigureTeam(
    catalog: FigureCatalog,
    figureIdA: FigureId,
    figureIdB: FigureId,
): boolean {
    const teamA = resolveFigureTeam(catalog, figureIdA)
    const teamB = resolveFigureTeam(catalog, figureIdB)

    if (teamA === undefined || teamB === undefined) {
        return false
    }

    return teamA === teamB
}

export function normalizeFigureDefinition(
    entry: FigureDefinition | LegacyFigureDefinition,
): FigureDefinition {
    const states = extractStatesFromEntry(entry)
        .map(state => normalizeFigureState(state, entry.id))

    const team = normalizeFigureTeam((entry as FigureDefinition).team)
    const moveDirection = normalizeFigureMoveDirection((entry as FigureDefinition).moveDirection)

    return {
        id: entry.id,
        states: states.length > 0 ? states : [createDefaultFigureState(entry.id)],
        ...(team !== undefined ? { team } : {}),
        ...(moveDirection !== 'up' ? { moveDirection } : {}),
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
