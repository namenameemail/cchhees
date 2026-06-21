import { describe, expect, it } from 'vitest'
import {
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
} from '../figureFilter'
import { removeFigureReferencesFromBoardEventRules } from './figureReferences'
import {
    FigureEventConditionType,
    FigureEventType,
    GameActionType,
} from '../types/events'

describe('removeFigureReferencesFromBoardEventRules action subjects', () => {
    it('scrubs concrete figure from action.subject.entries', () => {
        const eventRules = removeFigureReferencesFromBoardEventRules({
            eventRules: [{
                id: 'r1',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: {
                        entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                        matchMode: 'any',
                    },
                    type: FigureEventConditionType.movedBy,
                    params: { dx: 1, dy: 0 },
                }],
                actions: [{
                    type: GameActionType.setOtherState,
                    subject: {
                        entries: [
                            { figureId: FIGURE_SUBJECT_STEPPED_ON },
                            { figureId: 'rook' },
                        ],
                        matchMode: 'any',
                    },
                    params: { stateIndex: 1 },
                }],
            }],
        }, 'rook')

        const action = eventRules?.[0]?.actions?.[0]
        expect(action?.subject?.entries).toEqual([
            { figureId: FIGURE_SUBJECT_STEPPED_ON },
        ])
    })

    it('removes spawnFigure when figureId matches removed figure', () => {
        const eventRules = removeFigureReferencesFromBoardEventRules({
            eventRules: [{
                id: 'r1',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [],
                actions: [{
                    type: GameActionType.spawnFigure,
                    params: { figureId: 'rook', x: 1, y: 1, stateIndex: 0 },
                }],
            }],
        }, 'rook')

        expect(eventRules?.[0]?.actions).toEqual([])
    })
})
