import { describe, expect, it } from 'vitest'
import {
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
} from '../../figureFilter'
import { normalizeGameAction } from '../../figureView'
import {
    FigureEventType,
    GameActionType,
} from '../../types/events'

describe('normalizeGameAction', () => {
    it('migrates setOtherState.target to subject', () => {
        expect(normalizeGameAction({
            type: GameActionType.setOtherState,
            params: { stateIndex: 2, target: 'steppedBy' },
        }, { eventType: FigureEventType.steppedOnBy })).toEqual({
            type: GameActionType.setSelfState,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            params: { stateIndex: 2 },
        })
    })

    it('defaults subject for onMove displaceFigure', () => {
        expect(normalizeGameAction({
            type: GameActionType.displaceFigure,
            params: { dx: 1, dy: -1 },
        }, { eventType: FigureEventType.onMove })).toEqual({
            type: GameActionType.displaceFigure,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            params: { dx: 1, dy: -1 },
        })
    })

    it('defaults subject for steppedOnBy moveToCell', () => {
        expect(normalizeGameAction({
            type: GameActionType.moveToCell,
            params: { x: 4, y: 5 },
        }, { eventType: FigureEventType.steppedOnBy })).toEqual({
            type: GameActionType.moveToCell,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                matchMode: 'any',
            },
            params: { x: 4, y: 5 },
        })
    })

    it('defaults moveToCell params when switching from another action type', () => {
        expect(normalizeGameAction({
            type: GameActionType.moveToCell,
            params: { stateIndex: 0 },
        }, { eventType: FigureEventType.onMove })).toEqual({
            type: GameActionType.moveToCell,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            params: { x: 1, y: 1 },
        })
    })

    it('defaults displaceFigure params when switching from another action type', () => {
        expect(normalizeGameAction({
            type: GameActionType.displaceFigure,
            params: { stateIndex: 0 },
        }, { eventType: FigureEventType.onMove })).toEqual({
            type: GameActionType.displaceFigure,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            params: { dx: 1, dy: 0 },
        })
    })

    it('clamps invalid moveToCell coordinates to defaults', () => {
        expect(normalizeGameAction({
            type: GameActionType.moveToCell,
            params: { x: 0, y: 1 },
        })).toEqual({
            type: GameActionType.moveToCell,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            params: { x: 1, y: 1 },
        })
    })

    it('omits subject for spawnFigure', () => {
        expect(normalizeGameAction({
            type: GameActionType.spawnFigure,
            params: { figureId: 'pawn', x: 2, y: 3, stateIndex: 0 },
        })).toEqual({
            type: GameActionType.spawnFigure,
            params: { figureId: 'pawn', x: 2, y: 3, stateIndex: 0 },
        })
    })
})
