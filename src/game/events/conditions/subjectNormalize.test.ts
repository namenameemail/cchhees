import { describe, expect, it } from 'vitest'
import { FIGURE_SUBJECT_MOVED } from '../../figureFilter'
import { normalizeFigureEventRule } from '../../figureView'
import {
    FigureEventConditionType,
    FigureEventType,
    GameActionType,
} from '../../types/events'

describe('normalizeFigureEventRule subject migration', () => {
    it('migrates legacy moved kind to entries', () => {
        const normalized = normalizeFigureEventRule({
            id: 'r1',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [{
                subject: { kind: 'moved' },
                type: FigureEventConditionType.movedBy,
                params: { dx: 1, dy: 0 },
            }],
            actions: [{ type: GameActionType.setSelfState, params: { stateIndex: 0 } }],
        } as unknown as Parameters<typeof normalizeFigureEventRule>[0])

        expect(normalized?.conditions[0]?.subject).toEqual({
            entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
            matchMode: 'any',
        })
    })

    it('normalizes inFigureArea condition params', () => {
        const normalized = normalizeFigureEventRule({
            id: 'r-area',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [{
                subject: { entries: [{ figureId: FIGURE_SUBJECT_MOVED }] },
                type: FigureEventConditionType.inFigureArea,
                params: { cells: [{ x: 2, y: 3 }] },
            }],
            actions: [],
        })

        expect(normalized?.conditions[0]?.params).toMatchObject({
            cells: [{ x: 2, y: 3 }],
        })
    })

    it('keeps hasFigureInArea when params lack cells (defaults area)', () => {
        const normalized = normalizeFigureEventRule({
            id: 'r-has-area',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [{
                subject: { entries: [{ figureId: FIGURE_SUBJECT_MOVED }] },
                type: FigureEventConditionType.hasFigureInArea,
                params: {
                    figures: [{ figureId: '*' }],
                    matchMode: 'any',
                },
            }],
            actions: [],
        })

        expect(normalized?.conditions).toHaveLength(1)
        expect(normalized?.conditions[0]?.type).toBe(FigureEventConditionType.hasFigureInArea)
        expect(normalized?.conditions[0]?.params).toMatchObject({
            cells: [{ x: 0, y: 1 }],
            matchMode: 'any',
            orientToTeamDirection: true,
        })
    })

    it('preserves orientToTeamDirection false for hasFigureInArea', () => {
        const normalized = normalizeFigureEventRule({
            id: 'r-has-area-off',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [{
                subject: { entries: [{ figureId: FIGURE_SUBJECT_MOVED }] },
                type: FigureEventConditionType.hasFigureInArea,
                params: {
                    figures: [{ figureId: '*' }],
                    cells: [{ x: 0, y: 1 }],
                    matchMode: 'any',
                    orientToTeamDirection: false,
                },
            }],
            actions: [],
        })

        expect(normalized?.conditions[0]?.params).toMatchObject({
            orientToTeamDirection: false,
        })
    })

    it('keeps rule with empty actions and conditions', () => {
        const normalized = normalizeFigureEventRule({
            id: 'r-empty',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [],
            actions: [],
        })

        expect(normalized).toEqual({
            id: 'r-empty',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [],
            actions: [],
        })
    })
})
