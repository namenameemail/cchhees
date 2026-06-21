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
