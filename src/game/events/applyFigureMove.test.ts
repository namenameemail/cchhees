import { describe, expect, it } from 'vitest'
import { applyFigureMove } from './applyFigureMove'
import { createFigurePlacement } from '../figureView'
import { emptyFiguresSlice } from '../moveDebug/compareFigureBoards'
import { getTopOfStack, pushToStack } from '../figureStack'
import { FigureCatalog } from '../types/figures'
import { testBoardParameters } from '../testFixtures'
const catalog: FigureCatalog = []

describe('applyFigureMove', () => {
    it('moves actor to empty cell', () => {
        const from = { i: 0, j: 0 }
        const to = { i: 1, j: 0 }
        const actor = createFigurePlacement('pawn')
        const before = pushToStack(emptyFiguresSlice(), from, actor)

        const after = applyFigureMove(before, {
            from,
            to,
            actorPlacement: actor,
            swapOnEat: false,
            boardParameters: testBoardParameters,
            catalog,
        })

        expect(getTopOfStack(after, from)).toBeUndefined()
        expect(getTopOfStack(after, to)?.instanceId).toBe(actor.instanceId)
    })

    it('swaps stacks when swapOnEat is true', () => {
        const from = { i: 0, j: 0 }
        const to = { i: 1, j: 0 }
        const actor = createFigurePlacement('pawn')
        const target = createFigurePlacement('rook')
        let before = pushToStack(emptyFiguresSlice(), from, actor)
        before = pushToStack(before, to, target)

        const after = applyFigureMove(before, {
            from,
            to,
            actorPlacement: actor,
            targetAtTo: target,
            swapOnEat: true,
            boardParameters: testBoardParameters,
            catalog,
        })

        expect(getTopOfStack(after, to)?.instanceId).toBe(actor.instanceId)
        expect(getTopOfStack(after, from)?.instanceId).toBe(target.instanceId)
    })
})
