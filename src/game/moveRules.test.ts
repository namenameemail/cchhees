import { describe, expect, it } from 'vitest'
import { getMoveDelta, matchMoveRule, isFigureMoveAllowed } from './moveRules'
import { createFigurePlacement } from './figureView'
import { emptyFiguresSlice } from './moveDebug/compareFigureBoards'
import { pushToStack } from './figureStack'
import { rookDefinition, testBoardParameters } from './testFixtures'

describe('moveRules', () => {
    it('getMoveDelta computes coordinate difference', () => {
        expect(getMoveDelta({ i: 1, j: 2 }, { i: 4, j: 2 })).toEqual({ di: 3, dj: 0 })
    })

    it('matchMoveRule accepts orthogonal moves', () => {
        expect(matchMoveRule({ di: 1, dj: 0 }, { x: 1, y: 0 })).toBe(1)
        expect(matchMoveRule({ di: 0, dj: 2 }, { x: 0, y: 1, n: 0 })).toBe(2)
    })

    it('matchMoveRule rejects non-aligned moves', () => {
        expect(matchMoveRule({ di: 1, dj: 1 }, { x: 1, y: 0 })).toBeNull()
    })

    it('isFigureMoveAllowed blocks path when occupied', () => {
        const from = { i: 0, j: 0 }
        const blocker = createFigurePlacement('pawn')
        const actor = createFigurePlacement('rook')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 2, j: 0 }, blocker)

        const allowed = isFigureMoveAllowed(
            from,
            { i: 4, j: 0 },
            {
                ...rookDefinition,
                states: [{
                    viewParams: {},
                    moveRules: [{ x: 1, y: 0, n: 0 }],
                }],
            },
            figures.figuresByCoord,
            testBoardParameters,
            actor,
        )

        expect(allowed).toBe(false)
    })

    it('isFigureMoveAllowed allows empty destination', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const figures = pushToStack(emptyFiguresSlice(), from, actor)

        const allowed = isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            rookDefinition,
            figures.figuresByCoord,
            testBoardParameters,
            actor,
        )

        expect(allowed).toBe(true)
    })
})
