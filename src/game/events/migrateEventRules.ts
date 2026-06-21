import { FIGURE_FILTER_ANY, FIGURE_SUBJECT_MOVED, FIGURE_SUBJECT_STEPPED_ON } from '../figureFilter'
import {
    FigureEventCondition,
    FigureEventConditionSubject,
    FigureEventConditionType,
    FigureEventParams,
    FigureEventRule,
    FigureEventType,
    isLegacyFigureEventType,
    LegacyFigureEventParamsAreaEnteredBy,
    LegacyFigureEventParamsEnterCell,
    LegacyFigureEventParamsEnterFigureArea,
    LegacyFigureEventParamsEnterRect,
    LegacyFigureEventParamsStepOnFigure,
    LegacyFigureEventParamsSteppedOnBy,
    LegacyFigureEventType,
    PersistedFigureEventRule,
} from '../types/events'

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

function migrateEnterCell(params?: LegacyFigureEventParamsEnterCell): FigureEventCondition[] {
    if (!params) {
        return []
    }

    return [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.landedOnCell,
        params: { x: params.x, y: params.y },
    }]
}

function migrateLeaveCell(params?: LegacyFigureEventParamsEnterCell): FigureEventCondition[] {
    if (!params) {
        return []
    }

    return [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.leftCell,
        params: { x: params.x, y: params.y },
    }]
}

function migrateEnterRect(params?: LegacyFigureEventParamsEnterRect): FigureEventCondition[] {
    if (!params) {
        return []
    }

    return [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.landedInBoardArea,
        params: {
            x1: params.x1,
            y1: params.y1,
            x2: params.x2,
            y2: params.y2,
        },
    }]
}

function migrateStepOnFigure(params?: LegacyFigureEventParamsStepOnFigure): {
    eventParams: FigureEventParams
    conditions: FigureEventCondition[]
} {
    const conditions: FigureEventCondition[] = [{
        subject: MOVED_SUBJECT,
        type: FigureEventConditionType.landedOnFigure,
        params: {
            figures: params?.targetFigures ?? [{ figureId: FIGURE_FILTER_ANY }],
            matchMode: 'any',
            stackTarget: params?.stackTarget ?? 'all',
            ...(params?.stackIndex !== undefined ? { stackIndex: params.stackIndex } : {}),
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
        type: FigureEventConditionType.landedInFigureArea,
        params: {
            anchorFigures: params?.anchorFigures,
            cells: params?.cells,
            includePassive: params?.includePassive,
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
        type: FigureEventConditionType.figureEnteredArea,
        params: {
            cells: params?.cells,
            includePassive: params?.includePassive,
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
        type: FigureEventConditionType.steppedOnByFigure,
        params: {
            stepperFigures: params?.stepperFigures ?? [{ figureId: FIGURE_FILTER_ANY }],
            matchMode: 'any',
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
            conditions: rule.conditions ?? [],
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
            conditions: rule.conditions ?? [],
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
                conditions: rule.conditions ?? [],
                actions: rule.actions,
            }
        default:
            return {
                id: rule.id,
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: rule.conditions ?? [],
                actions: rule.actions,
            }
    }
}

export function resolveEventRule(rule: PersistedFigureEventRule): FigureEventRule {
    return migrateFigureEventRule(rule)
}
