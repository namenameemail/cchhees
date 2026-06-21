import { describe, expect, it } from 'vitest'
import { getMoveDelta, matchMoveRule, isFigureMoveAllowed, orientMoveRule, rotateMoveVector } from './moveRules'
import { createFigurePlacement } from './figureView'
import { emptyFiguresSlice } from './moveDebug/compareFigureBoards'
import { pushToStack } from './figureStack'
import { rookDefinition, testBoardParameters } from './testFixtures'
import type { FigureCatalog } from './types/figures'

const teamCatalog: FigureCatalog = [
    { id: 'rook', team: 0, states: rookDefinition.states },
    { id: 'pawn', team: 0, states: [{ viewParams: {}, moveRules: [] }] },
    { id: 'enemy', team: 1, states: [{ viewParams: {}, moveRules: [] }] },
]

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
                    jumpOverPieces: false,
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

    it('isFigureMoveAllowed blocks landing on own team by default', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const ally = createFigurePlacement('pawn')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 1, j: 0 }, ally)

        const allowed = isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            rookDefinition,
            figures.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )

        expect(allowed).toBe(false)
    })

    it('isFigureMoveAllowed allows landing on own team when enabled', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const ally = createFigurePlacement('pawn')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 1, j: 0 }, ally)

        const allowed = isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            {
                ...rookDefinition,
                states: [{
                    viewParams: {},
                    moveRules: [{ x: 1, y: 0 }],
                    canStepOnOwnTeam: true,
                }],
            },
            figures.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )

        expect(allowed).toBe(true)
    })

    it('isFigureMoveAllowed allows landing on enemy team', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const enemy = createFigurePlacement('enemy')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 1, j: 0 }, enemy)

        const allowed = isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            rookDefinition,
            figures.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )

        expect(allowed).toBe(true)
    })

    it('isFigureMoveAllowed respects landing empty', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const enemy = createFigurePlacement('enemy')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 1, j: 0 }, enemy)

        const definition = {
            ...rookDefinition,
            states: [{
                viewParams: {},
                moveRules: [{ x: 1, y: 0, landing: 'empty' as const }],
            }],
        }

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            definition,
            figures.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(false)

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            definition,
            pushToStack(emptyFiguresSlice(), from, actor).figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(true)
    })

    it('isFigureMoveAllowed respects landing capture', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const enemy = createFigurePlacement('enemy')
        const ally = createFigurePlacement('pawn')
        let figuresWithEnemy = pushToStack(emptyFiguresSlice(), from, actor)
        figuresWithEnemy = pushToStack(figuresWithEnemy, { i: 1, j: 1 }, enemy)
        let figuresWithAlly = pushToStack(emptyFiguresSlice(), from, actor)
        figuresWithAlly = pushToStack(figuresWithAlly, { i: 1, j: 1 }, ally)

        const definition = {
            ...rookDefinition,
            states: [{
                viewParams: {},
                moveRules: [{ x: 1, y: 1, landing: 'capture' as const }],
            }],
        }

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 1 },
            definition,
            figuresWithEnemy.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(true)

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 1 },
            definition,
            figuresWithAlly.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(false)

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 1 },
            definition,
            pushToStack(emptyFiguresSlice(), from, actor).figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(false)
    })

    it('rotateMoveVector rotates all directions', () => {
        expect(rotateMoveVector(0, 1, 'up')).toEqual({ x: 0, y: 1 })
        expect(rotateMoveVector(0, 1, 'right')).toEqual({ x: 1, y: 0 })
        expect(rotateMoveVector(0, 1, 'down')).toEqual({ x: 0, y: -1 })
        expect(rotateMoveVector(0, 1, 'left')).toEqual({ x: -1, y: 0 })
    })

    it('orientMoveRule preserves landing and n', () => {
        expect(orientMoveRule({ x: 0, y: 2, n: 1, landing: 'empty' }, 'right')).toEqual({
            x: 2,
            y: 0,
            n: 1,
            landing: 'empty',
        })
    })

    it('isFigureMoveAllowed applies moveDirection right', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const figures = pushToStack(emptyFiguresSlice(), from, actor)

        const definition = {
            ...rookDefinition,
            moveDirection: 'right' as const,
            states: [{
                viewParams: {},
                moveRules: [{ x: 0, y: 1 }],
            }],
        }

        expect(isFigureMoveAllowed(
            from,
            { i: 0, j: 1 },
            definition,
            figures.figuresByCoord,
            testBoardParameters,
            actor,
        )).toBe(false)

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            definition,
            figures.figuresByCoord,
            testBoardParameters,
            actor,
        )).toBe(true)
    })
})
