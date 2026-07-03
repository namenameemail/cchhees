import { describe, expect, it } from 'vitest'
import { applyFigureMove } from './applyFigureMove'
import { createFigurePlacement } from '../figureView'
import { getStack, getTopOfStack, pushToStack } from '../figureStack'
import { emptyFiguresSlice } from '../moveDebug/compareFigureBoards'
import {
    FigureEventConditionType,
    FigureEventRule,
    FigureEventType,
    GameActionType,
} from '../types/events'
import { FigureCatalog } from '../types/figures'
import { testBoardParameters } from '../testFixtures'
import {
    FIGURE_SUBJECT_STEPPED_ON,
} from '../figureFilter'

const catalog: FigureCatalog = [
    { id: 'actor', states: [{ viewParams: {} }] },
    { id: 'target', states: [{ viewParams: {} }] },
]

describe('steppedOn default stack', () => {
    it('keeps stepper and target stacked when no steppedOnBy rule matches', () => {
        const from = { i: 0, j: 0 }
        const to = { i: 1, j: 0 }
        const actor = createFigurePlacement('actor')
        const target = createFigurePlacement('target')

        let before = pushToStack(emptyFiguresSlice(), from, actor)
        before = pushToStack(before, to, target)

        const after = applyFigureMove(before, {
            from,
            to,
            actorPlacement: actor,
            targetAtTo: target,
            swapOnEat: false,
            boardParameters: testBoardParameters,
            catalog,
            eventRules: [],
        })

        const stack = getStack(after, to)

        expect(stack).toHaveLength(2)
        expect(getTopOfStack(after, to)?.instanceId).toBe(actor.instanceId)
        expect(stack[0]?.instanceId).toBe(target.instanceId)
        expect(after.tray).toHaveLength(0)
    })

    it('moves target to tray when steppedOnBy rule explicitly uses moveToTray', () => {
        const from = { i: 0, j: 0 }
        const to = { i: 1, j: 0 }
        const actor = createFigurePlacement('actor')
        const target = createFigurePlacement('target')

        let before = pushToStack(emptyFiguresSlice(), from, actor)
        before = pushToStack(before, to, target)

        const captureRules: FigureEventRule[] = [{
            id: 'capture-stepped-on',
            type: FigureEventType.steppedOnBy,
            params: { cause: 'any' },
            conditions: [{
                subject: {
                    entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                    matchMode: 'any',
                },
                type: FigureEventConditionType.hasFigureInArea,
                params: { figures: [{ figureId: '*' }], cells: [{ x: 0, y: 0 }], matchMode: 'any', movePhase: 'after' },
            }],
            actions: [{
                type: GameActionType.moveToTray,
                params: {},
            }],
        }]

        const after = applyFigureMove(before, {
            from,
            to,
            actorPlacement: actor,
            targetAtTo: target,
            swapOnEat: false,
            boardParameters: testBoardParameters,
            catalog,
            eventRules: captureRules,
        })

        expect(getStack(after, to)).toHaveLength(1)
        expect(getTopOfStack(after, to)?.instanceId).toBe(actor.instanceId)
        expect(after.tray).toHaveLength(1)
        expect(after.tray[0]?.instanceId).toBe(target.instanceId)
    })
})
