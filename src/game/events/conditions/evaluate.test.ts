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
    it('matches inBoardArea (movePhase after) on a single cell', () => {
        const actor = createFigurePlacement('pawn')
        const matches = evaluateOnMoveRule(
            {
                id: 'r1',
                type: FigureEventType.onMove,
                params: { cause: 'manual' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inBoardArea,
                    params: { x1: 3, y1: 4, x2: 3, y2: 4, movePhase: 'after' },
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
                type: FigureEventConditionType.inBoardArea,
                params: { x1: 3, y1: 4, x2: 3, y2: 4, movePhase: 'after' },
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

    it('matches hasFigureInArea(cells:[{0,0}], movePhase:after) landing on a figure', () => {
        const actor = createFigurePlacement('knight')
        const rook = createFigurePlacement('rook')

        const matches = evaluateOnMoveRule(
            {
                id: 'r2',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.hasFigureInArea,
                    params: {
                        figures: [{ figureId: 'rook' }],
                        cells: [{ x: 0, y: 0 }],
                        matchMode: 'any',
                        movePhase: 'after',
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
    })

    it('skips hasFigureInArea when no figure matches concrete subject filter', () => {
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
                    type: FigureEventConditionType.hasFigureInArea,
                    params: {
                        figures: [{ figureId: 'pawn' }],
                        cells: [{ x: 0, y: 0 }],
                        matchMode: 'any',
                        movePhase: 'after',
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
            type: FigureEventConditionType.inBoardArea,
            params: { x1: 3, y1: 4, x2: 3, y2: 4, movePhase: 'after' },
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
            type: FigureEventConditionType.inBoardArea,
            params: { x1: 3, y1: 4, x2: 3, y2: 4, movePhase: 'after' },
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
                    type: FigureEventConditionType.hasFigureInArea,
                    params: {
                        figures: [{ figureId: 'DraughtsKingBlack' }],
                        cells: [{ x: 0, y: 0 }],
                        matchMode: 'any',
                        movePhase: 'after',
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

describe('condition subject filtering', () => {
    const moveCtxBase = {
        boardParameters: testBoardParameters,
        catalog: [],
        eventRules: [],
        stepCause: 'manual' as const,
    }

    it('movedBy rejects move when actor does not match concrete subject filter', () => {
        const actor = createFigurePlacement('ChessKingBlack')

        const matches = evaluateAllConditions([{
            subject: {
                entries: [{ figureId: 'ChessKingWhite', stateIndex: 0 }],
                matchMode: 'any',
            },
            type: FigureEventConditionType.movedBy,
            params: { dx: 2, dy: 0 },
        }], {
            move: {
                from: { i: 4, j: 0 },
                to: { i: 6, j: 0 },
                actorPlacement: actor,
                ...moveCtxBase,
            },
            figuresByCoord: { '6,0': [actor] },
        })

        expect(matches.length).toBe(0)
    })

    it('movedBy matches when actor matches concrete subject filter', () => {
        const actor = createFigurePlacement('ChessKingWhite')

        const matches = evaluateAllConditions([{
            subject: {
                entries: [{ figureId: 'ChessKingWhite', stateIndex: 0 }],
                matchMode: 'any',
            },
            type: FigureEventConditionType.movedBy,
            params: { dx: 2, dy: 0 },
        }], {
            move: {
                from: { i: 4, j: 0 },
                to: { i: 6, j: 0 },
                actorPlacement: actor,
                ...moveCtxBase,
            },
            figuresByCoord: { '6,0': [actor] },
        })

        expect(matches.length).toBe(1)
    })

    it('movedBy orients delta when orientToTeamDirection is true', () => {
        const actor = createFigurePlacement('king')
        const catalog = [{ id: 'king', team: 0, states: [{ viewParams: {} }] }]
        const boardParameters = {
            ...testBoardParameters,
            teamMoveDirections: { 0: 'right' as const },
        }

        const matches = evaluateAllConditions([{
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            type: FigureEventConditionType.movedBy,
            params: { dx: 0, dy: 1, orientToTeamDirection: true },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 1, j: 2 },
                actorPlacement: actor,
                boardParameters,
                catalog,
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: { '1,2': [actor] },
        })

        expect(matches.length).toBe(1)
    })

    it('hoppedOverFigures rejects when hopper does not match subject filter', () => {
        const actor = createFigurePlacement('knight')
        const pawn = createFigurePlacement('pawn')

        const matches = evaluateAllConditions([{
            subject: {
                entries: [{ figureId: 'ChessKingWhite', stateIndex: 0 }],
                matchMode: 'any',
            },
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
                ...moveCtxBase,
            },
            figuresByCoord: {},
            hoppedFigures: [pawn],
        })

        expect(matches.length).toBe(0)
    })

    it('hasFigureInArea rejects when stepped-on target does not match subject filter', () => {
        const actor = createFigurePlacement('pawn')
        const target = createFigurePlacement('pawn')

        const matches = evaluateOnMoveRule(
            {
                id: 'stepped-on-wrong-subject',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: {
                        entries: [{ figureId: 'ChessRookWhite', stateIndex: 0 }],
                        matchMode: 'any',
                    },
                    type: FigureEventConditionType.hasFigureInArea,
                    params: {
                        figures: [{ figureId: 'pawn' }],
                        cells: [{ x: 0, y: 0 }],
                        matchMode: 'any',
                        movePhase: 'after',
                    },
                }],
                actions: [],
            },
            {
                from: { i: 1, j: 2 },
                to: { i: 2, j: 2 },
                actorPlacement: actor,
                targetAtTo: target,
                ...moveCtxBase,
            },
            { '2,2': [target, actor] },
        )

        expect(matches).toEqual([])
    })
})

describe('hasFigureInArea', () => {
    const movedSubject = {
        entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
        matchMode: 'any' as const,
    }

    it('matches when a filtered figure exists anywhere in the area stack (movePhase before)', () => {
        const actor = createFigurePlacement('king')
        const pawn = createFigurePlacement('pawn')
        const blocker = createFigurePlacement('rook')

        const matches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'pawn' }],
                cells: [{ x: 0, y: 1 }],
                matchMode: 'any',
                orientToTeamDirection: true,
                movePhase: 'before',
            },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 3, j: 2 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: {
                '2,2': [actor],
                '2,3': [blocker, pawn],
            },
        })

        expect(matches.length).toBe(1)
    })

    it('does not count the subject instance in its own area', () => {
        const actor = createFigurePlacement('pawn')

        const matches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'pawn' }],
                cells: [{ x: 0, y: 0 }],
                matchMode: 'any',
                movePhase: 'before',
            },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 3, j: 2 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: {
                '2,2': [actor],
            },
        })

        expect(matches.length).toBe(0)
    })

    it('requires every filter entry when matchMode is all', () => {
        const actor = createFigurePlacement('king')
        const pawn = createFigurePlacement('pawn')
        const rook = createFigurePlacement('rook')

        const matches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'pawn' }, { figureId: 'rook' }],
                cells: [{ x: 0, y: 1 }, { x: 1, y: 0 }],
                matchMode: 'all',
                movePhase: 'before',
            },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 3, j: 2 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: {
                '2,2': [actor],
                '2,3': [pawn],
                '3,2': [rook],
            },
        })

        expect(matches.length).toBe(1)
    })

    it('rejects castling-like move when rook is not in king area at from (movePhase before)', () => {
        const actor = createFigurePlacement('ChessKingWhite')
        const rook = createFigurePlacement('ChessRookWhite')

        const matches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'ChessRookWhite', stateIndex: 0 }],
                cells: [
                    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
                    { x: -1, y: 0 }, { x: 1, y: 0 },
                    { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
                ],
                matchMode: 'any',
                movePhase: 'before',
            },
        }], {
            move: {
                from: { i: 0, j: 2 },
                to: { i: 2, j: 2 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: {
                '0,2': [actor],
                '3,2': [rook],
            },
        })

        expect(matches.length).toBe(0)
    })

    it('orients canonical forward cell by owner team moveDirection (movePhase before)', () => {
        const actor = createFigurePlacement('king')
        const pawn = createFigurePlacement('pawn')
        const catalog = [{ id: 'king', team: 0, states: [{ viewParams: {} }] }]
        const boardParameters = {
            ...testBoardParameters,
            teamMoveDirections: { 0: 'right' as const },
        }

        const matches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'pawn' }],
                cells: [{ x: 0, y: 1 }],
                matchMode: 'any',
                orientToTeamDirection: true,
                movePhase: 'before',
            },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 3, j: 2 },
                actorPlacement: actor,
                boardParameters,
                catalog,
                eventRules: [],
                ownerFigureId: 'king',
                stepCause: 'manual',
            },
            ownerFigureId: 'king',
            figuresByCoord: {
                '2,2': [actor],
                '1,2': [pawn],
            },
        })

        expect(matches.length).toBe(1)
    })

    it('keeps up-oriented cells when team moveDirection is up (movePhase before)', () => {
        const actor = createFigurePlacement('king')
        const pawn = createFigurePlacement('pawn')
        const catalog = [{ id: 'king', team: 0, states: [{ viewParams: {} }] }]
        const boardParameters = {
            ...testBoardParameters,
            teamMoveDirections: { 0: 'up' as const },
        }

        const matches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'pawn' }],
                cells: [{ x: 0, y: 1 }],
                matchMode: 'any',
                orientToTeamDirection: true,
                movePhase: 'before',
            },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 3, j: 2 },
                actorPlacement: actor,
                boardParameters,
                catalog,
                eventRules: [],
                ownerFigureId: 'king',
                stepCause: 'manual',
            },
            ownerFigureId: 'king',
            figuresByCoord: {
                '2,2': [actor],
                '2,3': [pawn],
            },
        })

        expect(matches.length).toBe(1)
    })

    it('movePhase after (default) looks at the landed position for $moved, fixing the pre-refactor before-only bug', () => {
        const actor = createFigurePlacement('king')
        const pawn = createFigurePlacement('pawn')

        const afterMatches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'pawn' }],
                cells: [{ x: 0, y: 1 }],
                matchMode: 'any',
            },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 3, j: 2 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: {
                '3,2': [actor],
                '3,3': [pawn],
            },
        })

        expect(afterMatches.length).toBe(1)

        const beforeMatches = evaluateAllConditions([{
            subject: movedSubject,
            type: FigureEventConditionType.hasFigureInArea,
            params: {
                figures: [{ figureId: 'pawn' }],
                cells: [{ x: 0, y: 1 }],
                matchMode: 'any',
                movePhase: 'before',
            },
        }], {
            move: {
                from: { i: 2, j: 2 },
                to: { i: 3, j: 2 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            figuresByCoord: {
                '3,2': [actor],
                '3,3': [pawn],
            },
        })

        expect(beforeMatches.length).toBe(0)
    })
})

describe('inBoardArea movePhase', () => {
    it('movePhase before checks the pre-move position', () => {
        const actor = createFigurePlacement('pawn')
        const matches = evaluateOnMoveRule(
            {
                id: 'r-before',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inBoardArea,
                    params: { x1: 1, y1: 1, x2: 1, y2: 1, movePhase: 'before' },
                }],
                actions: [],
            },
            {
                from: { i: 0, j: 0 },
                to: { i: 2, j: 0 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            { '2,0': [actor] },
        )

        expect(matches.length).toBe(1)
    })

    it('movePhase after does not match the pre-move position', () => {
        const actor = createFigurePlacement('pawn')
        const matches = evaluateOnMoveRule(
            {
                id: 'r-after',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inBoardArea,
                    params: { x1: 1, y1: 1, x2: 1, y2: 1, movePhase: 'after' },
                }],
                actions: [],
            },
            {
                from: { i: 0, j: 0 },
                to: { i: 2, j: 0 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            { '2,0': [actor] },
        )

        expect(matches.length).toBe(0)
    })

    it('movePhase entered matches only when the landing cell was not already inside', () => {
        const actor = createFigurePlacement('pawn')
        const matches = evaluateOnMoveRule(
            {
                id: 'r-entered',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inBoardArea,
                    params: { x1: 3, y1: 1, x2: 3, y2: 1, movePhase: 'entered' },
                }],
                actions: [],
            },
            {
                from: { i: 0, j: 0 },
                to: { i: 2, j: 0 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            { '2,0': [actor] },
        )

        expect(matches.length).toBe(1)
    })

    it('movePhase left matches only when the figure just vacated the area', () => {
        const actor = createFigurePlacement('pawn')
        const matches = evaluateOnMoveRule(
            {
                id: 'r-left',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inBoardArea,
                    params: { x1: 1, y1: 1, x2: 1, y2: 1, movePhase: 'left' },
                }],
                actions: [],
            },
            {
                from: { i: 0, j: 0 },
                to: { i: 2, j: 0 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
            },
            { '2,0': [actor] },
        )

        expect(matches.length).toBe(1)
    })
})

describe('inBoardArea orientToTeamDirection (absolute area, rotated by team direction)', () => {
    const rect = { x1: 1, y1: 1, x2: 3, y2: 3, orientToTeamDirection: true, movePhase: 'after' as const }

    function matchesFor(figureId: string, from: { i: number; j: number }, to: { i: number; j: number }) {
        const actor = createFigurePlacement(figureId)
        return evaluateOnMoveRule(
            {
                id: 'r-oriented',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{ subject: movedSubject, type: FigureEventConditionType.inBoardArea, params: rect }],
                actions: [],
            },
            {
                from,
                to,
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [
                    { id: 'pawnUp', moveDirection: 'up', states: [{ viewParams: {} }] },
                    { id: 'pawnDown', moveDirection: 'down', states: [{ viewParams: {} }] },
                ],
                eventRules: [],
                stepCause: 'manual',
            },
            { [`${to.i},${to.j}`]: [actor] },
        ).length
    }

    it('up direction behaves exactly like the absolute area (no rotation)', () => {
        expect(matchesFor('pawnUp', { i: 5, j: 5 }, { i: 0, j: 0 })).toBe(1)
    })

    it('down direction mirrors the area to the opposite board corner', () => {
        // testBoardParameters is 8x8: (1,1)-(3,3) mirrors to i:[5,7] j:[5,7] (0-based)
        expect(matchesFor('pawnDown', { i: 0, j: 0 }, { i: 6, j: 6 })).toBe(1)
        expect(matchesFor('pawnDown', { i: 5, j: 5 }, { i: 6, j: 6 })).toBe(1)
    })

    it('down direction does NOT match near the un-rotated (1,1) corner', () => {
        expect(matchesFor('pawnDown', { i: 5, j: 5 }, { i: 0, j: 0 })).toBe(0)
    })
})

describe('inFigureArea movePhase', () => {
    const anchorFilter = [{ figureId: 'king' }]
    const cells = [{ x: 0, y: -3 }, { x: 0, y: -2 }]

    function runWithPhase(movePhase: 'before' | 'after' | 'entered' | 'left') {
        const actor = createFigurePlacement('pawn')
        const king = createFigurePlacement('king')

        return evaluateOnMoveRule(
            {
                id: `r-${movePhase}`,
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inFigureArea,
                    params: { anchorFigures: anchorFilter, cells, movePhase },
                }],
                actions: [],
            },
            {
                from: { i: 2, j: 2 },
                to: { i: 2, j: 3 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
                figuresBeforeMove: {
                    '2,2': [actor],
                    '2,5': [king],
                },
            },
            {
                '2,3': [actor],
                '2,5': [king],
            },
        )
    }

    it('movePhase before and after both match a move that stays inside the area (guard semantics)', () => {
        expect(runWithPhase('before').length).toBe(1)
        expect(runWithPhase('after').length).toBe(1)
    })

    it('movePhase entered/left do not fire for a move that stays inside the area', () => {
        expect(runWithPhase('entered').length).toBe(0)
        expect(runWithPhase('left').length).toBe(0)
    })

    it('movePhase entered populates areaAnchor/subjectCoord/triggerConditionType, used by displaceFigure implicit-subject resolution', () => {
        const actor = createFigurePlacement('pawn')
        const king = createFigurePlacement('king')

        const matches = evaluateOnMoveRule(
            {
                id: 'r-entered-context',
                type: FigureEventType.onMove,
                params: { cause: 'any' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inFigureArea,
                    params: { anchorFigures: anchorFilter, cells, movePhase: 'entered' },
                }],
                actions: [],
            },
            {
                from: { i: 2, j: 1 },
                to: { i: 2, j: 3 },
                actorPlacement: actor,
                boardParameters: testBoardParameters,
                catalog: [],
                eventRules: [],
                stepCause: 'manual',
                figuresBeforeMove: {
                    '2,1': [actor],
                    '2,5': [king],
                },
            },
            {
                '2,3': [actor],
                '2,5': [king],
            },
        )

        expect(matches.length).toBe(1)
        expect(matches[0]?.triggerConditionType).toBe(FigureEventConditionType.inFigureArea)
        expect(matches[0]?.areaAnchor).toEqual({ i: 2, j: 5 })
        expect(matches[0]?.subjectCoord).toEqual({ i: 2, j: 3 })
        expect(matches[0]?.subjectPlacement?.instanceId).toBe(actor.instanceId)
    })
})
