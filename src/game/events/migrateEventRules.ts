import { FIGURE_FILTER_ANY, FIGURE_SUBJECT_MOVED, FIGURE_SUBJECT_STEPPED_ON } from '../figureFilter'
import {
    FigureEventCondition,
    FigureEventConditionSubject,
    FigureEventConditionType,
    FigureEventParams,
    FigureEventRule,
    FigureEventType,
    isLegacyFigureEventType,
    LegacyFigureEventConditionType,
    LegacyFigureEventConditionParamsFigureEnteredArea,
    LegacyFigureEventConditionParamsLandedInBoardArea,
    LegacyFigureEventConditionParamsLandedInFigureArea,
    LegacyFigureEventConditionParamsLandedOnCell,
    LegacyFigureEventConditionParamsLandedOnFigure,
    LegacyFigureEventConditionParamsLeftCell,
    LegacyFigureEventConditionParamsOnCells,
    LegacyFigureEventConditionParamsSteppedOnByFigure,
    LegacyFigureEventParamsAreaEnteredBy,
    LegacyFigureEventParamsEnterCell,
    LegacyFigureEventParamsEnterFigureArea,
    LegacyFigureEventParamsEnterRect,
    LegacyFigureEventParamsStepOnFigure,
    LegacyFigureEventParamsSteppedOnBy,
    LegacyFigureEventType,
    PersistedFigureEventRule,
} from '../types/events'
import { logFigureConditionDropped } from '../figureEventRulesDebugLog'

const MOVED_SUBJECT: FigureEventConditionSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
    matchMode: 'any',
}
const STEPPED_ON_SUBJECT: FigureEventConditionSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
    matchMode: 'any',
}

function hasConditions(rule: PersistedFigureEventRule): boolean {
    return Array.isArray(rule.conditions) && rule.conditions.length > 0
}

/** Счётчик условий, отброшенных при миграции без эквивалента (onCells>1 клетки, aboveFigures/belowFigures). Инспектируется тестами. */
export const droppedConditionsDuringMigration: Array<{ ruleId?: string; conditionType: string; reason: string }> = []

function reportDroppedCondition(conditionType: string, reason: string, ruleId?: string) {
    droppedConditionsDuringMigration.push({ ruleId, conditionType, reason })
    logFigureConditionDropped({
        ruleId,
        conditionIndex: -1,
        condition: { subject: { entries: [] }, type: conditionType as FigureEventConditionType },
        reason,
    })
}

type PersistedFigureEventCondition = {
    subject: FigureEventConditionSubject
    type: string
    params?: unknown
}

/** Мигрирует один condition legacy-типа (landedOnCell, landedOnFigure и т.п.) в новую модель movePhase. См. docs/figure-events-contract.md#миграция-удалённых-типов */
export function migrateConditionType(
    condition: PersistedFigureEventCondition,
    ruleId?: string,
): FigureEventCondition[] {
    switch (condition.type) {
        case LegacyFigureEventConditionType.landedOnCell: {
            const p = condition.params as LegacyFigureEventConditionParamsLandedOnCell | undefined
            if (!p) {
                return []
            }
            return [{
                subject: condition.subject,
                type: FigureEventConditionType.inBoardArea,
                params: {
                    x1: p.x, y1: p.y, x2: p.x, y2: p.y,
                    orientToTeamDirection: p.orientToTeamDirection,
                    movePhase: 'after',
                },
            }]
        }
        case LegacyFigureEventConditionType.leftCell: {
            const p = condition.params as LegacyFigureEventConditionParamsLeftCell | undefined
            if (!p) {
                return []
            }
            return [{
                subject: condition.subject,
                type: FigureEventConditionType.inBoardArea,
                params: {
                    x1: p.x, y1: p.y, x2: p.x, y2: p.y,
                    orientToTeamDirection: p.orientToTeamDirection,
                    movePhase: 'left',
                },
            }]
        }
        case LegacyFigureEventConditionType.landedInBoardArea: {
            const p = condition.params as LegacyFigureEventConditionParamsLandedInBoardArea | undefined
            if (!p) {
                return []
            }
            return [{
                subject: condition.subject,
                type: FigureEventConditionType.inBoardArea,
                params: { ...p, movePhase: 'after' },
            }]
        }
        case LegacyFigureEventConditionType.landedInFigureArea:
        case LegacyFigureEventConditionType.figureEnteredArea: {
            const p = condition.params as
                LegacyFigureEventConditionParamsLandedInFigureArea
                | LegacyFigureEventConditionParamsFigureEnteredArea
                | undefined
            return [{
                subject: condition.subject,
                type: FigureEventConditionType.inFigureArea,
                params: {
                    anchorFigures: (p as LegacyFigureEventConditionParamsLandedInFigureArea | undefined)?.anchorFigures,
                    cells: p?.cells,
                    includePassive: p?.includePassive,
                    orientToTeamDirection: p?.orientToTeamDirection,
                    movePhase: 'entered',
                },
            }]
        }
        case LegacyFigureEventConditionType.landedOnFigure: {
            const p = condition.params as LegacyFigureEventConditionParamsLandedOnFigure | undefined
            return [{
                subject: condition.subject,
                type: FigureEventConditionType.hasFigureInArea,
                params: {
                    cells: [{ x: 0, y: 0 }],
                    figures: p?.figures,
                    matchMode: p?.matchMode,
                    movePhase: 'after',
                },
            }]
        }
        case LegacyFigureEventConditionType.steppedOnByFigure: {
            const p = condition.params as LegacyFigureEventConditionParamsSteppedOnByFigure | undefined
            return [{
                subject: condition.subject,
                type: FigureEventConditionType.hasFigureInArea,
                params: {
                    cells: [{ x: 0, y: 0 }],
                    figures: p?.stepperFigures,
                    matchMode: p?.matchMode,
                    movePhase: 'after',
                },
            }]
        }
        case LegacyFigureEventConditionType.onCells: {
            const p = condition.params as LegacyFigureEventConditionParamsOnCells | undefined
            if (p?.cells?.length === 1) {
                const c = p.cells[0]
                return [{
                    subject: condition.subject,
                    type: FigureEventConditionType.inBoardArea,
                    params: {
                        x1: c.x, y1: c.y, x2: c.x, y2: c.y,
                        orientToTeamDirection: p.orientToTeamDirection,
                        movePhase: 'after',
                    },
                }]
            }
            reportDroppedCondition(condition.type, 'onCells with more than one cell has no rectangular equivalent', ruleId)
            return []
        }
        case LegacyFigureEventConditionType.aboveFigures:
        case LegacyFigureEventConditionType.belowFigures:
            reportDroppedCondition(condition.type, 'stack-relative conditions removed without replacement', ruleId)
            return []
        default:
            return [condition as FigureEventCondition]
    }
}

export function migrateConditionsArray(
    conditions: PersistedFigureEventCondition[] | undefined,
    ruleId?: string,
): FigureEventCondition[] {
    return (conditions ?? []).flatMap(condition => migrateConditionType(condition, ruleId))
}

function migrateEnterCell(params?: LegacyFigureEventParamsEnterCell): FigureEventCondition[] {
    if (!params) {
        return []
    }

    return [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.inBoardArea,
        params: { x1: params.x, y1: params.y, x2: params.x, y2: params.y, movePhase: 'after' },
    }]
}

function migrateLeaveCell(params?: LegacyFigureEventParamsEnterCell): FigureEventCondition[] {
    if (!params) {
        return []
    }

    return [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.inBoardArea,
        params: { x1: params.x, y1: params.y, x2: params.x, y2: params.y, movePhase: 'left' },
    }]
}

function migrateEnterRect(params?: LegacyFigureEventParamsEnterRect): FigureEventCondition[] {
    if (!params) {
        return []
    }

    return [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.inBoardArea,
        params: {
            x1: params.x1,
            y1: params.y1,
            x2: params.x2,
            y2: params.y2,
            movePhase: 'after',
        },
    }]
}

function migrateStepOnFigure(params?: LegacyFigureEventParamsStepOnFigure): {
    eventParams: FigureEventParams
    conditions: FigureEventCondition[]
} {
    const conditions: FigureEventCondition[] = [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.hasFigureInArea,
        params: {
            cells: [{ x: 0, y: 0 }],
            figures: params?.targetFigures ?? [{ figureId: FIGURE_FILTER_ANY }],
            matchMode: 'any',
            movePhase: 'after',
        },
    }]

    const eventParams: FigureEventParams = {}
    if (params?.cause && params.cause !== 'any') {
        (eventParams as { cause?: typeof params.cause }).cause = params.cause
    }

    return { eventParams, conditions }
}

function migrateEnterFigureArea(params?: LegacyFigureEventParamsEnterFigureArea): FigureEventCondition[] {
    return [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.inFigureArea,
        params: {
            anchorFigures: params?.anchorFigures,
            cells: params?.cells,
            includePassive: params?.includePassive,
            movePhase: 'entered',
        },
    }]
}

function migrateAreaEnteredBy(params?: LegacyFigureEventParamsAreaEnteredBy): {
    eventParams: FigureEventParams
    conditions: FigureEventCondition[]
} {
    const subject: FigureEventConditionSubject = params?.entererFigures?.length
        ? { entries: [params.entererFigures[0]], matchMode: 'any' }
        : MOVED_SUBJECT

    const conditions: FigureEventCondition[] = [{
        subject,
        type: FigureEventConditionType.inFigureArea,
        params: {
            cells: params?.cells,
            includePassive: params?.includePassive,
            movePhase: 'entered',
        },
    }]

    const eventParams: FigureEventParams = {}
    if (params?.cause && params.cause !== 'any') {
        (eventParams as { cause?: typeof params.cause }).cause = params.cause
    }

    return { eventParams, conditions }
}

function migrateSteppedOnBy(params?: LegacyFigureEventParamsSteppedOnBy): {
    eventParams: FigureEventParams
    conditions: FigureEventCondition[]
} {
    const conditions: FigureEventCondition[] = [{
        subject: STEPPED_ON_SUBJECT,
        type: FigureEventConditionType.hasFigureInArea,
        params: {
            cells: [{ x: 0, y: 0 }],
            figures: params?.stepperFigures ?? [{ figureId: FIGURE_FILTER_ANY }],
            matchMode: 'any',
            movePhase: 'after',
        },
    }]

    const eventParams: FigureEventParams = {
        cause: params?.cause ?? 'any',
        stackPosition: params?.stackPosition ?? 'any',
        ...(params?.stackIndex !== undefined ? { stackIndex: params.stackIndex } : {}),
    }

    return { eventParams, conditions }
}

export function migrateFigureEventRule(rule: PersistedFigureEventRule): FigureEventRule {
    if (!isLegacyFigureEventType(rule.type) && hasConditions(rule)) {
        return {
            id: rule.id,
            type: rule.type as FigureEventType,
            params: rule.params,
            conditions: migrateConditionsArray(rule.conditions, rule.id),
            actions: rule.actions,
        }
    }

    if (!isLegacyFigureEventType(rule.type)) {
        const type = rule.type as FigureEventType

        if (type === FigureEventType.steppedOnBy && !hasConditions(rule)) {
            const migrated = migrateSteppedOnBy(rule.params as LegacyFigureEventParamsSteppedOnBy | undefined)
            return {
                id: rule.id,
                type: FigureEventType.steppedOnBy,
                params: migrated.eventParams,
                conditions: migrated.conditions,
                actions: rule.actions,
            }
        }

        if (type === FigureEventType.onMove && !hasConditions(rule)) {
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: rule.params ?? { cause: 'any' },
                conditions: [],
                actions: rule.actions,
            }
        }

        return {
            id: rule.id,
            type,
            params: rule.params,
            conditions: migrateConditionsArray(rule.conditions, rule.id),
            actions: rule.actions,
        }
    }

    const legacyType = rule.type as unknown as LegacyFigureEventType
    const params = rule.params

    switch (legacyType) {
        case LegacyFigureEventType.enterCell:
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: migrateEnterCell(params as LegacyFigureEventParamsEnterCell | undefined),
                actions: rule.actions,
            }
        case LegacyFigureEventType.leaveCell:
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: migrateLeaveCell(params as LegacyFigureEventParamsEnterCell | undefined),
                actions: rule.actions,
            }
        case LegacyFigureEventType.enterRect: {
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: migrateEnterRect(params as LegacyFigureEventParamsEnterRect | undefined),
                actions: rule.actions,
            }
        }
        case LegacyFigureEventType.stepOnFigure: {
            const migrated = migrateStepOnFigure(params as LegacyFigureEventParamsStepOnFigure | undefined)
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: migrated.eventParams,
                conditions: migrated.conditions,
                actions: rule.actions,
            }
        }
        case LegacyFigureEventType.enterFigureArea:
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: migrateEnterFigureArea(params as LegacyFigureEventParamsEnterFigureArea | undefined),
                actions: rule.actions,
            }
        case LegacyFigureEventType.areaEnteredBy: {
            const migrated = migrateAreaEnteredBy(params as LegacyFigureEventParamsAreaEnteredBy | undefined)
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: migrated.eventParams,
                conditions: migrated.conditions,
                actions: rule.actions,
            }
        }
        case LegacyFigureEventType.steppedOnBy: {
            const migrated = migrateSteppedOnBy(params as LegacyFigureEventParamsSteppedOnBy | undefined)
            return {
                id: rule.id,
                type: FigureEventType.steppedOnBy,
                params: migrated.eventParams,
                conditions: migrated.conditions,
                actions: rule.actions,
            }
        }
        case LegacyFigureEventType.leaveBoard:
            return {
                id: rule.id,
                type: FigureEventType.leaveBoard,
                params: {},
                conditions: migrateConditionsArray(rule.conditions, rule.id),
                actions: rule.actions,
            }
        default:
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: migrateConditionsArray(rule.conditions, rule.id),
                actions: rule.actions,
            }
    }
}

export function resolveEventRule(rule: PersistedFigureEventRule): FigureEventRule {
    return migrateFigureEventRule(rule)
}
