import { describe, expect, it } from 'vitest'
import { runFigureEvents } from './runFigureEvents'
import { createFigurePlacement } from '../figureView'
import { getTopOfStack, pushToStack } from '../figureStack'
import { emptyFiguresSlice } from '../moveDebug/compareFigureBoards'
import {
    FigureEventConditionType,
    FigureEventRule,
    FigureEventType,
    GameActionType,
} from '../types/events'
import { FigureCatalog } from '../types/figures'
import {
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
} from '../figureFilter'

import { BoardBackgroundImageFit } from '../types/boardParameters'

const board = { n: 5, m: 5, cellWidth: 20, cellHeight: 20, cellXDistance: 50, cellYDistance: 50, swapOnEat: false, background: 'white', backgroundAssetId: null, backgroundImageFit: BoardBackgroundImageFit.tile, borderRadius: 0, borderWidth: 0, borderColor: 'black', axisNumberings: [] }

const catalog: FigureCatalog = [
    { id: 'pieceA', states: [{ viewParams: {} }] },
    { id: 'pieceB', states: [{ viewParams: {} }] },
    { id: 'pieceC', states: [{ viewParams: {} }] },
    { id: 'marker', states: [{ viewParams: {} }] },
]

function buildInlineSpawnRules(): FigureEventRule[] {
    return [
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
                params: { figures: [{ figureId: '*' }], cells: [{ x: 0, y: 0 }], matchMode: 'any', movePhase: 'after' },
            }],
            actions: [{
                type: GameActionType.displaceFigure,
                subject: {
                    entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                    matchMode: 'any',
                },
                params: { dx: 1, dy: 0 },
            }],
        },
        {
            id: 'on-move-push-then-spawn',
            type: FigureEventType.onMove,
            params: { cause: 'any' },
            conditions: [{
                subject: {
                    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                    matchMode: 'any',
                },
                type: FigureEventConditionType.hasFigureInArea,
                params: {
                    figures: [{ figureId: 'pieceB' }],
                    cells: [{ x: 0, y: 0 }],
                    matchMode: 'any',
                    movePhase: 'after',
                },
            }],
            actions: [
                {
                    type: GameActionType.displaceFigure,
                    subject: {
                        entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                        matchMode: 'any',
                    },
                    params: { dx: 1, dy: 0 },
                },
                {
                    type: GameActionType.spawnFigure,
                    params: { figureId: 'marker', stateIndex: 0, x: 4, y: 1 },
                },
            ],
        },
    ]
}

describe('inline spawn event resolve', () => {
    it('resolves displacement chain before the next action in the same rule', () => {
        const cell = { i: 1, j: 0 }
        const actor = createFigurePlacement('pieceA')
        const target = createFigurePlacement('pieceB')
        const blocker = createFigurePlacement('pieceC')

        let before = pushToStack(emptyFiguresSlice(), cell, target)
        before = pushToStack(before, cell, actor)
        before = pushToStack(before, { i: 2, j: 0 }, blocker)

        const after = runFigureEvents(before, {
            from: cell,
            to: cell,
            actorPlacement: actor,
            targetAtTo: target,
            boardParameters: board,
            catalog,
            eventRules: buildInlineSpawnRules(),
            stepCause: 'manual',
            stepperPlacement: actor,
            stepperCoord: cell,
        })

        expect(getTopOfStack(after, { i: 3, j: 0 })?.figureId).toBe('marker')
        expect(getTopOfStack(after, { i: 2, j: 0 })?.figureId).toBe('pieceB')
        expect(getTopOfStack(after, { i: 1, j: 0 })?.figureId).toBe('pieceA')
    })
})
