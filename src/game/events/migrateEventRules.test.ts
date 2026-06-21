import { describe, expect, it } from 'vitest'
import {
    FigureEventConditionType,
    FigureEventType,
    GameActionType,
    LegacyFigureEventType,
    PersistedFigureEventRule,
} from '../types/events'
import { FIGURE_SUBJECT_MOVED } from '../figureFilter'
import { migrateFigureEventRule } from './migrateEventRules'

const movedSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
    matchMode: 'any' as const,
}

describe('migrateFigureEventRule', () => {
    it('migrates enterCell to onMove + landedOnCell', () => {
        const migrated = migrateFigureEventRule({
            id: 'r1',
            type: LegacyFigureEventType.enterCell,
            params: { x: 3, y: 4 },
            conditions: [],
            actions: [{ type: GameActionType.setSelfState, params: { stateIndex: 1 } }],
        } as PersistedFigureEventRule)

        expect(migrated.type).toBe(FigureEventType.onMove)
        expect(migrated.conditions).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.landedOnCell,
            params: { x: 3, y: 4 },
        }])
    })

    it('migrates stepOnFigure to onMove + landedOnFigure', () => {
        const migrated = migrateFigureEventRule({
            id: 'r2',
            type: LegacyFigureEventType.stepOnFigure,
            params: {
                targetFigures: [{ figureId: 'pawn' }],
                cause: 'manual',
                stackTarget: 'top',
            },
            conditions: [],
            actions: [{ type: GameActionType.moveToTray, params: {} }],
        } as PersistedFigureEventRule)

        expect(migrated.type).toBe(FigureEventType.onMove)
        expect(migrated.params).toEqual({ cause: 'manual' })
        expect(migrated.conditions[0]?.type).toBe(FigureEventConditionType.landedOnFigure)
    })

    it('keeps already migrated onMove rules', () => {
        const rule: PersistedFigureEventRule = {
            id: 'r3',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [{
                subject: movedSubject,
                type: FigureEventConditionType.movedBy,
                params: { dx: 1, dy: 0 },
            }],
            actions: [{ type: GameActionType.setSelfState, params: { stateIndex: 0 } }],
        }

        expect(migrateFigureEventRule(rule)).toEqual(rule)
    })
})
