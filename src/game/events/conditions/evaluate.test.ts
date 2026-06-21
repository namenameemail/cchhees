import { describe, expect, it } from 'vitest'
import { FIGURE_FILTER_ANY, FIGURE_SUBJECT_MOVED, FIGURE_SUBJECT_STEPPED_ON } from '../../figureFilter'
import { createFigurePlacement } from '../../figureView'
import {
    FigureEventConditionType,
    FigureEventType,
    GameActionType,
} from '../../types/events'
import { evaluateOnMoveRule, evaluateAllConditions } from './evaluate'

import { testBoardParameters } from '../../testFixtures'

const movedSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
    matchMode: 'any' as const,
}

describe('evaluateOnMoveRule', () => {
    it('matches landedOnCell', () => {
        const actor = createFigurePlacement('pawn')
        const matches = evaluateOnMoveRule(
            {
                id: 'r1',
                type: FigureEventType.onMove,
                params: { cause: 'manual' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.landedOnCell,
                    params: { x: 3, y: 4 },
                }],
                actions: [],
            },
            {
                from: { i: 1, j: 2 },
                to: { i: 2, j: 3 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            { '2,3': [actor] },
        )

        expect(matches.length).toBe(1)
    })

    it('requires AND of multiple conditions', () => {
        const actor = createFigurePlacement('pawn')
        const ctx = {
            from: { i: 1, j: 2 },
            to: { i: 2, j: 3 },
            actorPlacement: actor,
            boardParameters: testBoardParameters,
            catalog: [],
            eventRules: [],
            stepCause: 'manual' as const,
        }

        const matched = evaluateAllConditions([
            {
                subject: movedSubject,
                type: FigureEventConditionType.landedOnCell,
                params: { x: 3, y: 4 },
            },
            {
                subject: movedSubject,
                type: FigureEventConditionType.movedBy,
                params: { dx: 1, dy: 1 },
            },
        ], {
            move: ctx,
            figuresByCoord: { '2,3': [actor] },
        })

        expect(matched.length).toBe(1)
    })

    it('matches landedOnFigure with filter', () => {
        const actor = createFigurePlacement('knight')
        const rook = createFigurePlacement('rook')

        const matches = evaluateOnMoveRule(
            {
                id: 'r2',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.landedOnFigure,
                    params: {
                        figures: [{ figureId: 'rook' }],
                        matchMode: 'any',
                        stackTarget: 'all',
                    },
                }],
                actions: [],
            },
            {
                from: { i: 0, j: 0 },
                to: { i: 2, j: 2 },
                actorPlacement: actor,
                targetAtTo: rook,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            { '2,2': [rook, actor] },
        )

        expect(matches.length).toBe(1)
        expect(matches[0]?.stepOnTarget?.figureId).toBe('rook')
    })

    it('skips landedOnFigure when mover does not match concrete subject filter', () => {
        const pawnB = createFigurePlacement('pawn')
        const pawnC = createFigurePlacement('pawn')

        const matches = evaluateOnMoveRule(
            {
                id: 'queen-on-pawn',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: {
                        entries: [{ figureId: 'queen' }],
                        matchMode: 'any',
                    },
                    type: FigureEventConditionType.landedOnFigure,
                    params: {
                        figures: [{ figureId: 'pawn' }],
                        matchMode: 'any',
                        stackTarget: 'all',
                    },
                }],
                actions: [],
            },
            {
                from: { i: 2, j: 2 },
                to: { i: 1, j: 2 },
                actorPlacement: pawnB,
                targetAtTo: pawnC,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'displacement',
            },
            { '1,2': [pawnC, pawnB] },
        )

        expect(matches.length).toBe(0)
    })

    it('matches isFigure for moved subject', () => {
        const queen = createFigurePlacement('queen')
        const pawn = createFigurePlacement('pawn')

        const queenMatches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.isFigure,
            params: { figures: [{ figureId: 'queen' }] },
        }], {
            move: {
                from: { i: 0, j: 0 },
                to: { i: 1, j: 0 },
                actorPlacement: queen,
                targetAtTo: pawn,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '1,0': [pawn, queen] },
        })

        const pawnMatches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.isFigure,
            params: { figures: [{ figureId: 'queen' }] },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 1, j: 2 },
                actorPlacement: pawn,
                targetAtTo: pawn,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'displacement',
            },
            figuresByCoord: { '1,2': [pawn] },
        })

        expect(queenMatches.length).toBe(1)
        expect(pawnMatches.length).toBe(0)
    })

    it('matches isNotFigure for moved subject', () => {
        const queen = createFigurePlacement('queen')
        const pawn = createFigurePlacement('pawn')

        const queenMatches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.isNotFigure,
            params: { figures: [{ figureId: 'queen' }] },
        }], {
            move: {
                from: { i: 0, j: 0 },
                to: { i: 1, j: 0 },
                actorPlacement: queen,
                targetAtTo: pawn,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '1,0': [pawn, queen] },
        })

        const pawnMatches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.isNotFigure,
            params: { figures: [{ figureId: 'queen' }] },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 1, j: 2 },
                actorPlacement: pawn,
                targetAtTo: pawn,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'displacement',
            },
            figuresByCoord: { '1,2': [pawn] },
        })

        expect(queenMatches.length).toBe(0)
        expect(pawnMatches.length).toBe(1)
    })

    it('matches isFigure for steppedOn subject', () => {
        const queen = createFigurePlacement('queen')
        const pawn = createFigurePlacement('pawn')

        const matches = evaluateAllConditions([{
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                matchMode: 'any',
            },
            type: FigureEventConditionType.isFigure,
            params: { figures: [{ figureId: 'pawn' }] },
        }], {
            move: {
                from: { i: 0, j: 0 },
                to: { i: 1, j: 0 },
                actorPlacement: queen,
                targetAtTo: pawn,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '1,0': [pawn, queen] },
        })

        expect(matches.length).toBe(1)
    })

    it('matches hoppedOverFigures', () => {
        const actor = createFigurePlacement('knight')
        const pawn = createFigurePlacement('pawn')

        const matches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hoppedOverFigures,
            params: {
                figures: [{ figureId: FIGURE_FILTER_ANY }],
                matchMode: 'any',
            },
        }], {
            move: {
                from: { i: 0, j: 0 },
                to: { i: 2, j: 0 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: {},
            hoppedFigures: [pawn],
        })

        expect(matches.length).toBe(1)
    })

    it('uses subject matchMode all for multiple roles', () => {
        const actor = createFigurePlacement('pawn')
        const rook = createFigurePlacement('rook')

        const matchedAny = evaluateAllConditions([{
            subject: {
                entries: [
                    { figureId: FIGURE_SUBJECT_MOVED },
                    { figureId: FIGURE_SUBJECT_STEPPED_ON },
                ],
                matchMode: 'any',
            },
            type: FigureEventConditionType.landedOnCell,
            params: { x: 3, y: 4 },
        }], {
            move: {
                from: { i: 1, j: 2 },
                to: { i: 2, j: 3 },
                actorPlacement: actor,
                targetAtTo: rook,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '2,3': [rook, actor] },
        })

        expect(matchedAny.length).toBe(1)

        const matchedAll = evaluateAllConditions([{
            subject: {
                entries: [
                    { figureId: FIGURE_SUBJECT_MOVED },
                    { figureId: FIGURE_SUBJECT_STEPPED_ON },
                ],
                matchMode: 'all',
            },
            type: FigureEventConditionType.landedOnCell,
            params: { x: 3, y: 4 },
        }], {
            move: {
                from: { i: 1, j: 2 },
                to: { i: 2, j: 3 },
                actorPlacement: actor,
                targetAtTo: rook,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '2,3': [rook, actor] },
        })

        expect(matchedAll.length).toBe(1)
    })

    it('matches steppedOn rule only when stepped-on subject resolves', () => {
        const actor = createFigurePlacement('DraughtsManBlack')
        const rook = createFigurePlacement('ChessRookWhite')

        const matches = evaluateOnMoveRule(
            {
                id: 'stepped-on-rule',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: {
                        entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                        matchMode: 'any',
                    },
                    type: FigureEventConditionType.steppedOnByFigure,
                    params: {
                        stepperFigures: [{ figureId: 'DraughtsKingBlack' }],
                        matchMode: 'any',
                    },
                }],
                actions: [{
                    type: GameActionType.setSelfState,
                    params: { stateIndex: 0 },
                }],
            },
            {
                from: { i: 1, j: 2 },
                to: { i: 2, j: 2 },
                actorPlacement: actor,
                targetAtTo: rook,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            { '2,2': [rook, actor] },
        )

        expect(matches).toEqual([])
    })
})
