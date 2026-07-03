import { describe, expect, it } from 'vitest'
import {
    FigureEventConditionType,
    FigureEventType,
    GameActionType,
    LegacyFigureEventType,
    PersistedFigureEventRule,
} from '../types/events'
import { FIGURE_SUBJECT_MOVED, FIGURE_SUBJECT_STEPPED_ON } from '../figureFilter'
import { droppedConditionsDuringMigration, migrateConditionType, migrateFigureEventRule } from './migrateEventRules'

const movedSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
    matchMode: 'any' as const,
}
const steppedOnSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
    matchMode: 'any' as const,
}

describe('migrateFigureEventRule', () => {
    it('migrates enterCell to onMove + inBoardArea(after)', () => {
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
            type: FigureEventConditionType.inBoardArea,
            params: { x1: 3, y1: 4, x2: 3, y2: 4, movePhase: 'after' },
        }])
    })

    it('migrates stepOnFigure to onMove + hasFigureInArea(after)', () => {
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
        expect(migrated.conditions[0]?.type).toBe(FigureEventConditionType.hasFigureInArea)
        expect(migrated.conditions[0]?.params).toEqual({
            cells: [{ x: 0, y: 0 }],
            figures: [{ figureId: 'pawn' }],
            matchMode: 'any',
            movePhase: 'after',
        })
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

    it('migrates a persisted rule that still carries a legacy condition type (landedOnFigure) inside an onMove rule', () => {
        const rule = {
            id: 'r4',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [{
                subject: movedSubject,
                type: 'landedOnFigure',
                params: { figures: [{ figureId: 'rook' }], matchMode: 'any', stackTarget: 'all' },
            }],
            actions: [],
        } as unknown as PersistedFigureEventRule

        const migrated = migrateFigureEventRule(rule)

        expect(migrated.conditions).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: { cells: [{ x: 0, y: 0 }], figures: [{ figureId: 'rook' }], matchMode: 'any', movePhase: 'after' },
        }])
    })
})

describe('migrateConditionType', () => {
    it('migrates landedOnCell to inBoardArea(after)', () => {
        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'landedOnCell',
            params: { x: 3, y: 4, orientToTeamDirection: false },
        })

        expect(migrated).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.inBoardArea,
            params: { x1: 3, y1: 4, x2: 3, y2: 4, orientToTeamDirection: false, movePhase: 'after' },
        }])
    })

    it('migrates leftCell to inBoardArea(left)', () => {
        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'leftCell',
            params: { x: 3, y: 4 },
        })

        expect(migrated).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.inBoardArea,
            params: { x1: 3, y1: 4, x2: 3, y2: 4, orientToTeamDirection: undefined, movePhase: 'left' },
        }])
    })

    it('migrates landedInBoardArea to inBoardArea(after)', () => {
        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'landedInBoardArea',
            params: { x1: 1, y1: 1, x2: 3, y2: 3 },
        })

        expect(migrated).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.inBoardArea,
            params: { x1: 1, y1: 1, x2: 3, y2: 3, movePhase: 'after' },
        }])
    })

    it('migrates landedInFigureArea to inFigureArea(entered)', () => {
        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'landedInFigureArea',
            params: { anchorFigures: [{ figureId: 'king' }], cells: [{ x: 0, y: 1 }], includePassive: false },
        })

        expect(migrated).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.inFigureArea,
            params: {
                anchorFigures: [{ figureId: 'king' }],
                cells: [{ x: 0, y: 1 }],
                includePassive: false,
                orientToTeamDirection: undefined,
                movePhase: 'entered',
            },
        }])
    })

    it('migrates figureEnteredArea to inFigureArea(entered)', () => {
        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'figureEnteredArea',
            params: { cells: [{ x: 0, y: 1 }], includePassive: true },
        })

        expect(migrated).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.inFigureArea,
            params: {
                anchorFigures: undefined,
                cells: [{ x: 0, y: 1 }],
                includePassive: true,
                orientToTeamDirection: undefined,
                movePhase: 'entered',
            },
        }])
    })

    it('migrates landedOnFigure to hasFigureInArea(after), dropping stackTarget/stackIndex', () => {
        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'landedOnFigure',
            params: { figures: [{ figureId: 'rook' }], matchMode: 'all', stackTarget: 'top', stackIndex: 2 },
        })

        expect(migrated).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: { cells: [{ x: 0, y: 0 }], figures: [{ figureId: 'rook' }], matchMode: 'all', movePhase: 'after' },
        }])
        expect(migrated[0]?.params).not.toHaveProperty('stackTarget')
        expect(migrated[0]?.params).not.toHaveProperty('stackIndex')
    })

    it('migrates steppedOnByFigure to hasFigureInArea(after), keeping the steppedOn subject', () => {
        const migrated = migrateConditionType({
            subject: steppedOnSubject,
            type: 'steppedOnByFigure',
            params: { stepperFigures: [{ figureId: 'pawn' }], matchMode: 'any' },
        })

        expect(migrated).toEqual([{
            subject: steppedOnSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: { cells: [{ x: 0, y: 0 }], figures: [{ figureId: 'pawn' }], matchMode: 'any', movePhase: 'after' },
        }])
    })

    it('migrates onCells with a single cell to inBoardArea(after)', () => {
        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'onCells',
            params: { cells: [{ x: 2, y: 5 }], matchMode: 'any' },
        })

        expect(migrated).toEqual([{
            subject: movedSubject,
            type: FigureEventConditionType.inBoardArea,
            params: { x1: 2, y1: 5, x2: 2, y2: 5, orientToTeamDirection: undefined, movePhase: 'after' },
        }])
    })

    it('drops onCells with more than one cell and records it', () => {
        droppedConditionsDuringMigration.length = 0

        const migrated = migrateConditionType({
            subject: movedSubject,
            type: 'onCells',
            params: { cells: [{ x: 1, y: 1 }, { x: 2, y: 2 }], matchMode: 'any' },
        }, 'rule-with-onCells')

        expect(migrated).toEqual([])
        expect(droppedConditionsDuringMigration).toEqual([{
            ruleId: 'rule-with-onCells',
            conditionType: 'onCells',
            reason: expect.any(String),
        }])
    })

    it('drops aboveFigures/belowFigures without replacement and records it', () => {
        droppedConditionsDuringMigration.length = 0

        const aboveMigrated = migrateConditionType({
            subject: movedSubject,
            type: 'aboveFigures',
            params: { figures: [{ figureId: '*' }], matchMode: 'any' },
        }, 'rule-with-above')
        const belowMigrated = migrateConditionType({
            subject: movedSubject,
            type: 'belowFigures',
            params: { figures: [{ figureId: '*' }], matchMode: 'any' },
        }, 'rule-with-below')

        expect(aboveMigrated).toEqual([])
        expect(belowMigrated).toEqual([])
        expect(droppedConditionsDuringMigration.map(entry => entry.conditionType)).toEqual(['aboveFigures', 'belowFigures'])
    })

    it('passes through already-current condition types unchanged', () => {
        const condition = {
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: { cells: [{ x: 0, y: 0 }], movePhase: 'after' as const },
        }

        expect(migrateConditionType(condition)).toEqual([condition])
    })
})
