import { describe, expect, it } from 'vitest'
import { runFigureEvents } from '../runFigureEvents'
import { applyFigureMove } from '../applyFigureMove'
import { createFigurePlacement } from '../../figureView'
import { getStack, getTopOfStack, pushToStack } from '../../figureStack'
import { emptyFiguresSlice } from '../../moveDebug/compareFigureBoards'
import {
    FigureEventConditionType,
    FigureEventRule,
    FigureEventType,
    GameActionType,
} from '../../types/events'
import { FigureCatalog } from '../../types/figures'
import { testBoardParameters } from '../../testFixtures'
import { FIGURE_FILTER_ANY, FIGURE_SUBJECT_MOVED, FIGURE_SUBJECT_STEPPED_ON } from '../../figureFilter'

const catalog: FigureCatalog = [
    { id: 'pieceA', states: [{ viewParams: {} }] },
    { id: 'pieceB', states: [{ viewParams: {} }, { viewParams: {} }] },
    { id: 'pieceC', states: [{ viewParams: {} }] },
]

const movedSubject = {
    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
    matchMode: 'any' as const,
}

describe('displaceFigure triggers onMove for the displaced figure', () => {
    it('fires onMove(cause:displacement) when landing on an empty cell', () => {
        const actor = createFigurePlacement('pieceA')
        const b = createFigurePlacement('pieceB', 0)

        let before = pushToStack(emptyFiguresSlice(), { i: 0, j: 0 }, actor)
        before = pushToStack(before, { i: 5, j: 5 }, b)

        const rules: FigureEventRule[] = [
            {
                id: 'trigger-displace',
                type: FigureEventType.onMove,
                params: { cause: 'manual' },
                conditions: [],
                actions: [{
                    type: GameActionType.displaceFigure,
                    subject: { entries: [{ figureId: 'pieceB' }], matchMode: 'any' },
                    params: { dx: -1, dy: 0 },
                }],
            },
            {
                id: 'displaced-reacts',
                type: FigureEventType.onMove,
                params: { cause: 'displacement' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.movedBy,
                    params: { dx: -1, dy: 0 },
                }],
                actions: [{
                    type: GameActionType.setSelfState,
                    params: { stateIndex: 1 },
                }],
            },
        ]

        const after = runFigureEvents(before, {
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            actorPlacement: actor,
            boardParameters: testBoardParameters,
            catalog,
            eventRules: rules,
            stepCause: 'manual',
        })

        const landed = getTopOfStack(after, { i: 4, j: 5 })
        expect(landed?.instanceId).toBe(b.instanceId)
        expect(landed?.stateIndex).toBe(1)
    })

    it('does not fire the displacement-only rule for the original manual move', () => {
        const actor = createFigurePlacement('pieceA')
        const before = pushToStack(emptyFiguresSlice(), { i: 0, j: 0 }, actor)

        const rules: FigureEventRule[] = [
            {
                id: 'manual-only-should-not-trigger-displacement-rule',
                type: FigureEventType.onMove,
                params: { cause: 'displacement' },
                conditions: [],
                actions: [{
                    type: GameActionType.setSelfState,
                    params: { stateIndex: 1 },
                }],
            },
        ]

        const after = runFigureEvents(before, {
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            actorPlacement: actor,
            boardParameters: testBoardParameters,
            catalog,
            eventRules: rules,
            stepCause: 'manual',
        })

        const landed = getTopOfStack(after, { i: 1, j: 0 })
        expect(landed?.stateIndex).toBeUndefined()
    })

    it('resolves $moved and $steppedOn correctly when the displaced figure lands on an occupied cell', () => {
        const actor = createFigurePlacement('pieceA')
        const b = createFigurePlacement('pieceB', 0)
        const c = createFigurePlacement('pieceC')

        let before = pushToStack(emptyFiguresSlice(), { i: 0, j: 0 }, actor)
        before = pushToStack(before, { i: 5, j: 5 }, b)
        before = pushToStack(before, { i: 4, j: 5 }, c)

        const rules: FigureEventRule[] = [
            {
                id: 'trigger-displace-onto-occupied',
                type: FigureEventType.onMove,
                params: { cause: 'manual' },
                conditions: [],
                actions: [{
                    type: GameActionType.displaceFigure,
                    subject: { entries: [{ figureId: 'pieceB' }], matchMode: 'any' },
                    params: { dx: -1, dy: 0 },
                }],
            },
            {
                id: 'displaced-onto-occupied-reacts',
                type: FigureEventType.onMove,
                params: { cause: 'displacement' },
                conditions: [
                    {
                        subject: movedSubject,
                        type: FigureEventConditionType.movedBy,
                        params: { dx: -1, dy: 0 },
                    },
                    {
                        subject: {
                            entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                            matchMode: 'any',
                        },
                        type: FigureEventConditionType.isFigure,
                        params: { figures: [{ figureId: 'pieceC' }] },
                    },
                ],
                actions: [{
                    type: GameActionType.setSelfState,
                    params: { stateIndex: 1 },
                }],
            },
        ]

        const after = runFigureEvents(before, {
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            actorPlacement: actor,
            boardParameters: testBoardParameters,
            catalog,
            eventRules: rules,
            stepCause: 'manual',
        })

        const stack = getStack(after, { i: 4, j: 5 })
        const bOnTop = stack.find(item => item.instanceId === b.instanceId)
        expect(bOnTop?.stateIndex).toBe(1)
        expect(stack.some(item => item.instanceId === c.instanceId)).toBe(true)
    })

    it('recursively re-fires while the displaced figure stays inside a monitored zone, then stops at the board edge', () => {
        const actor = createFigurePlacement('pieceA')
        const b = createFigurePlacement('pieceB')

        let before = pushToStack(emptyFiguresSlice(), { i: 0, j: 0 }, actor)
        before = pushToStack(before, { i: 3, j: 5 }, b)

        const rules: FigureEventRule[] = [
            {
                id: 'kick-into-zone',
                type: FigureEventType.onMove,
                params: { cause: 'manual' },
                conditions: [],
                actions: [{
                    type: GameActionType.displaceFigure,
                    subject: { entries: [{ figureId: 'pieceB' }], matchMode: 'any' },
                    params: { dx: -1, dy: 0 },
                }],
            },
            {
                id: 'keep-pushing-inside-zone',
                type: FigureEventType.onMove,
                params: { cause: 'displacement' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.inBoardArea,
                    params: { x1: 1, y1: 1, x2: 3, y2: 8, movePhase: 'after' },
                }],
                actions: [{
                    type: GameActionType.displaceFigure,
                    params: { dx: -1, dy: 0 },
                }],
            },
        ]

        const after = runFigureEvents(before, {
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            actorPlacement: actor,
            boardParameters: testBoardParameters,
            catalog,
            eventRules: rules,
            stepCause: 'manual',
        })

        expect(after.figuresByCoord).not.toHaveProperty('0,5')
        expect(after.figuresByCoord).not.toHaveProperty('1,5')
        expect(after.figuresByCoord).not.toHaveProperty('2,5')
        expect(after.tray.some(item => item.instanceId === b.instanceId)).toBe(true)
    })

    it('fires onMove(cause:displacement) for displaceFigure inside a steppedOnBy rule too', () => {
        const actor = createFigurePlacement('pieceA')
        const target = createFigurePlacement('pieceB', 0)

        let before = pushToStack(emptyFiguresSlice(), { i: 0, j: 0 }, actor)
        before = pushToStack(before, { i: 1, j: 0 }, target)

        const rules: FigureEventRule[] = [
            {
                id: 'stepped-on-displace',
                type: FigureEventType.steppedOnBy,
                params: { cause: 'any' },
                conditions: [{
                    subject: {
                        entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                        matchMode: 'any',
                    },
                    type: FigureEventConditionType.hasFigureInArea,
                    params: { figures: [{ figureId: FIGURE_FILTER_ANY }], cells: [{ x: 0, y: 0 }], matchMode: 'any', movePhase: 'after' },
                }],
                actions: [{
                    type: GameActionType.displaceFigure,
                    params: { dx: 1, dy: 0 },
                }],
            },
            {
                id: 'displaced-from-steppedOn-reacts',
                type: FigureEventType.onMove,
                params: { cause: 'displacement' },
                conditions: [{
                    subject: movedSubject,
                    type: FigureEventConditionType.movedBy,
                    params: { dx: 1, dy: 0 },
                }],
                actions: [{
                    type: GameActionType.setSelfState,
                    params: { stateIndex: 1 },
                }],
            },
        ]

        const after = applyFigureMove(before, {
            from: { i: 0, j: 0 },
            to: { i: 1, j: 0 },
            actorPlacement: actor,
            targetAtTo: target,
            swapOnEat: false,
            boardParameters: testBoardParameters,
            catalog,
            eventRules: rules,
        })

        const landed = getTopOfStack(after, { i: 2, j: 0 })
        expect(landed?.instanceId).toBe(target.instanceId)
        expect(landed?.stateIndex).toBe(1)
    })
})
