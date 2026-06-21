import { describe, expect, it } from 'vitest'
import { applyGameAction } from '../execute'
import { SteppedOnQueueItem } from '../steppedOnQueue'
import { createFigurePlacement } from '../../figureView'
import { emptyFiguresSlice } from '../../moveDebug/compareFigureBoards'
import { getTopOfStack, pushToStack } from '../../figureStack'
import {
    FIGURE_SUBJECT_STEPPED_ON,
} from '../../figureFilter'
import {
    FigureEventType,
    GameActionType,
} from '../../types/events'
import { testBoardParameters } from '../../testFixtures'

describe('moveToCell action', () => {
    it('moves steppedOn subject to absolute cell', () => {
        const stepper = createFigurePlacement('knight')
        const target = createFigurePlacement('pawn')
        const targetCoord = { i: 2, j: 2 }
        const landingCoord = { i: 4, j: 5 }

        let figures = pushToStack(emptyFiguresSlice(), targetCoord, target)
        figures = pushToStack(figures, { i: 0, j: 0 }, stepper)

        const after = applyGameAction(figures, {
            type: GameActionType.moveToCell,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                matchMode: 'any',
            },
            params: { x: landingCoord.i + 1, y: landingCoord.j + 1 },
        }, {
            from: { i: 0, j: 0 },
            to: targetCoord,
            actorPlacement: stepper,
            targetAtTo: target,
            boardParameters: testBoardParameters,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.steppedOnBy,
            ownerFigureId: target.figureId,
        })

        expect(getTopOfStack(after, targetCoord)).toBeUndefined()
        expect(getTopOfStack(after, landingCoord)?.instanceId).toBe(target.instanceId)
    })

    it('queues displacement when landing is occupied', () => {
        const stepper = createFigurePlacement('knight')
        const target = createFigurePlacement('pawn')
        const blocker = createFigurePlacement('rook')
        const targetCoord = { i: 1, j: 1 }
        const landingCoord = { i: 3, j: 3 }

        let figures = pushToStack(emptyFiguresSlice(), targetCoord, target)
        figures = pushToStack(figures, landingCoord, blocker)
        figures = pushToStack(figures, { i: 0, j: 0 }, stepper)

        const queue: SteppedOnQueueItem[] = []
        const after = applyGameAction(figures, {
            type: GameActionType.moveToCell,
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_STEPPED_ON }],
                matchMode: 'any',
            },
            params: { x: landingCoord.i + 1, y: landingCoord.j + 1 },
        }, {
            from: { i: 0, j: 0 },
            to: targetCoord,
            actorPlacement: stepper,
            targetAtTo: target,
            boardParameters: testBoardParameters,
            catalog: [],
            eventRules: [],
            stepCause: 'manual',
            eventType: FigureEventType.steppedOnBy,
            ownerFigureId: target.figureId,
        }, queue)

        expect(getTopOfStack(after, targetCoord)).toBeUndefined()
        expect(getTopOfStack(after, landingCoord)?.instanceId).toBe(target.instanceId)
        expect(getTopOfStack(after, landingCoord)?.figureId).toBe('pawn')
        expect(queue).toHaveLength(1)
        expect('targetPlacement' in queue[0]! && queue[0].targetPlacement.instanceId).toBe(blocker.instanceId)
    })
})
