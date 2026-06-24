import { describe, expect, it } from 'vitest'
import {
    collectHoppedFigures,
    collectIntermediateCells,
    collectMinUnitPathCells,
    getMoveDelta,
    isFigureMoveAllowed,
    matchMoveRule,
    matchMoveSteps,
    moveDirectionGridTransform,
    orientAreaCell,
    orientAreaCells,
    orientMoveRule,
    rotateMoveVector,
} from './moveRules'
import { createDefaultMoveRule } from './migrateFigureMoveRules'
import { createFigurePlacement, normalizeFigureMoveRules } from './figureView'
import { emptyFiguresSlice } from './moveDebug/compareFigureBoards'
import { pushToStack } from './figureStack'
import { rookDefinition, testBoardParameters } from './testFixtures'
import type { FigureCatalog, FigureMoveRule } from './types/figures'

const teamCatalog: FigureCatalog = [
    { id: 'rook', team: 0, states: rookDefinition.states },
    { id: 'pawn', team: 0, states: [{ viewParams: {}, moveRules: [] }] },
    { id: 'enemy', team: 1, states: [{ viewParams: {}, moveRules: [] }] },
]

function makeState(moveRules: FigureMoveRule[]) {
    return {
        viewParams: {},
        moveRules: normalizeFigureMoveRules(moveRules),
    }
}

function makeDefinition(
    moveRules: FigureMoveRule[],
    patch: Record<string, unknown> = {},
) {
    return {
        ...rookDefinition,
        ...patch,
        states: [makeState(moveRules)],
    }
}

describe('moveRules', () => {
    it('getMoveDelta computes coordinate difference', () => {
        expect(getMoveDelta({ i: 1, j: 2 }, { i: 4, j: 2 })).toEqual({ di: 3, dj: 0 })
    })

    it('matchMoveSteps accepts orthogonal moves', () => {
        expect(matchMoveSteps({ di: 1, dj: 0 }, { x: 1, y: 0 })).toBe(1)
        expect(matchMoveSteps({ di: 0, dj: 2 }, { x: 0, y: 1 })).toBe(2)
    })

    it('matchMoveRule respects legacy n limit', () => {
        expect(matchMoveRule({ di: 0, dj: 2 }, { x: 0, y: 1, n: 0 })).toBe(2)
        expect(matchMoveRule({ di: 0, dj: 3 }, { x: 0, y: 1, n: 2 })).toBeNull()
    })

    it('collectIntermediateCells uses only vector steps for k=1', () => {
        expect(collectIntermediateCells({ i: 0, j: 0 }, { x: 2, y: 1 }, 1)).toEqual([])
        expect(collectIntermediateCells({ i: 0, j: 0 }, { x: 2, y: 1 }, 2)).toEqual([{ i: 2, j: 1 }])
    })

    it('collectMinUnitPathCells uses gcd-normalized unit steps', () => {
        expect(collectMinUnitPathCells({ i: 0, j: 0 }, { x: 2, y: 0 }, 1)).toEqual([{ i: 1, j: 0 }])
        expect(collectMinUnitPathCells({ i: 0, j: 0 }, { x: 2, y: 1 }, 1)).toEqual([])
        expect(collectMinUnitPathCells({ i: 0, j: 0 }, { x: 2, y: 1 }, 2)).toEqual([{ i: 2, j: 1 }])
    })

    it('isFigureMoveAllowed emptyPath blocks min-unit intermediate for (2,0)', () => {
        const from = { i: 0, j: 0 }
        const blocker = createFigurePlacement('pawn')
        const actor = createFigurePlacement('rook')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 1, j: 0 }, blocker)

        const rule = createDefaultMoveRule(2, 0)
        rule.empty.length = 0
        rule.empty.emptyPath = true

        expect(isFigureMoveAllowed(
            from,
            { i: 2, j: 0 },
            makeDefinition([rule]),
            figures.figuresByCoord,
            testBoardParameters,
            actor,
        )).toBe(false)

        rule.empty.emptyPath = false

        expect(isFigureMoveAllowed(
            from,
            { i: 2, j: 0 },
            makeDefinition([rule]),
            figures.figuresByCoord,
            testBoardParameters,
            actor,
        )).toBe(true)
    })

    it('isFigureMoveAllowed blocks path when occupied for empty variant', () => {
        const from = { i: 0, j: 0 }
        const blocker = createFigurePlacement('pawn')
        const actor = createFigurePlacement('rook')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 2, j: 0 }, blocker)

        const rule = createDefaultMoveRule(1, 0)
        rule.empty.length = 0

        const allowed = isFigureMoveAllowed(
            from,
            { i: 4, j: 0 },
            makeDefinition([rule]),
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

    it('isFigureMoveAllowed allows landing on own team when capture.allowOwnTeam', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const ally = createFigurePlacement('pawn')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 1, j: 0 }, ally)

        const rule = createDefaultMoveRule(1, 0)
        rule.empty.enabled = false
        rule.capture.allowOwnTeam = true

        const allowed = isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            makeDefinition([rule]),
            figures.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )

        expect(allowed).toBe(true)
    })

    it('isFigureMoveAllowed allows landing on enemy team via capture', () => {
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

    it('isFigureMoveAllowed respects empty-only variant', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const enemy = createFigurePlacement('enemy')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 1, j: 0 }, enemy)

        const rule = createDefaultMoveRule(1, 0)
        rule.capture.enabled = false

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            makeDefinition([rule]),
            figures.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(false)

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 0 },
            makeDefinition([rule]),
            pushToStack(emptyFiguresSlice(), from, actor).figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(true)
    })

    it('isFigureMoveAllowed respects capture-only variant', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const enemy = createFigurePlacement('enemy')
        const ally = createFigurePlacement('pawn')
        let figuresWithEnemy = pushToStack(emptyFiguresSlice(), from, actor)
        figuresWithEnemy = pushToStack(figuresWithEnemy, { i: 1, j: 1 }, enemy)
        let figuresWithAlly = pushToStack(emptyFiguresSlice(), from, actor)
        figuresWithAlly = pushToStack(figuresWithAlly, { i: 1, j: 1 }, ally)

        const rule = createDefaultMoveRule(1, 1)
        rule.empty.enabled = false

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 1 },
            makeDefinition([rule]),
            figuresWithEnemy.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(true)

        expect(isFigureMoveAllowed(
            from,
            { i: 1, j: 1 },
            makeDefinition([rule]),
            figuresWithAlly.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(false)
    })

    it('collectHoppedFigures returns jumped pieces for jumpOver variant', () => {
        const from = { i: 0, j: 0 }
        const to = { i: 0, j: 2 }
        const actor = createFigurePlacement('rook')
        const enemy = createFigurePlacement('enemy')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 0, j: 1 }, enemy)

        const rule = createDefaultMoveRule(0, 1)
        rule.empty.enabled = false
        rule.capture.enabled = false
        rule.jumpOver.enabled = true

        const hopped = collectHoppedFigures(
            from,
            to,
            normalizeFigureMoveRules([rule]),
            figures.figuresByCoord,
            'up',
            teamCatalog,
            actor,
        )

        expect(hopped).toHaveLength(1)
        expect(hopped[0]?.instanceId).toBe(enemy.instanceId)
    })

    it('isFigureMoveAllowed respects jumpOver variant', () => {
        const from = { i: 0, j: 0 }
        const actor = createFigurePlacement('rook')
        const enemy = createFigurePlacement('enemy')
        const ally = createFigurePlacement('pawn')
        const emptyBoard = pushToStack(emptyFiguresSlice(), from, actor)
        let withEnemy = pushToStack(emptyFiguresSlice(), from, actor)
        withEnemy = pushToStack(withEnemy, { i: 0, j: 1 }, enemy)
        let withAlly = pushToStack(emptyFiguresSlice(), from, actor)
        withAlly = pushToStack(withAlly, { i: 0, j: 1 }, ally)

        const rule = createDefaultMoveRule(0, 1)
        rule.empty.enabled = false
        rule.capture.enabled = false
        rule.jumpOver.enabled = true

        const definition = makeDefinition([rule])

        expect(isFigureMoveAllowed(
            from,
            { i: 0, j: 2 },
            definition,
            emptyBoard.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(false)

        expect(isFigureMoveAllowed(
            from,
            { i: 0, j: 2 },
            definition,
            withEnemy.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(true)

        expect(isFigureMoveAllowed(
            from,
            { i: 0, j: 2 },
            definition,
            withAlly.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(false)

        const allyJumpRule = createDefaultMoveRule(0, 1)
        allyJumpRule.empty.enabled = false
        allyJumpRule.capture.enabled = false
        allyJumpRule.jumpOver.enabled = true
        allyJumpRule.jumpOver.allowOwnTeam = true

        expect(isFigureMoveAllowed(
            from,
            { i: 0, j: 2 },
            makeDefinition([allyJumpRule]),
            withAlly.figuresByCoord,
            testBoardParameters,
            actor,
            teamCatalog,
        )).toBe(true)
    })

    it('isFigureMoveAllowed blocks jumpOver over own team without allowOwnTeam', () => {
        const from = { i: 1, j: 3 }
        const to = { i: 3, j: 1 }
        const actor = createFigurePlacement('DraughtsManWhite')
        const ally = createFigurePlacement('DraughtsManWhite')
        let figures = pushToStack(emptyFiguresSlice(), from, actor)
        figures = pushToStack(figures, { i: 2, j: 2 }, ally)

        const rule = createDefaultMoveRule(2, -2)
        rule.empty.enabled = false
        rule.capture.enabled = false
        rule.jumpOver.enabled = true

        const definition = {
            id: 'DraughtsManWhite',
            team: 0,
            states: [makeState([rule])],
        }

        expect(isFigureMoveAllowed(
            from,
            to,
            definition,
            figures.figuresByCoord,
            testBoardParameters,
            actor,
            [{ id: 'DraughtsManWhite', team: 0, states: definition.states }],
        )).toBe(false)
    })

    it('rotateMoveVector rotates all directions', () => {
        expect(rotateMoveVector(0, 1, 'up')).toEqual({ x: 0, y: 1 })
        expect(rotateMoveVector(0, 1, 'right')).toEqual({ x: -1, y: 0 })
        expect(rotateMoveVector(0, 1, 'down')).toEqual({ x: 0, y: -1 })
        expect(rotateMoveVector(0, 1, 'left')).toEqual({ x: 1, y: 0 })
    })

    it('orientAreaCell and orientAreaCells rotate like move rules', () => {
        expect(orientAreaCell({ x: 0, y: 1 }, 'right')).toEqual({ x: -1, y: 0 })
        expect(orientAreaCells([{ x: 0, y: 1 }, { x: 3, y: 0 }], 'right')).toEqual([
            { x: -1, y: 0 },
            { x: 0, y: 3 },
        ])
    })

    it('moveDirectionGridTransform maps directions to CSS transforms', () => {
        expect(moveDirectionGridTransform('up')).toBe('none')
        expect(moveDirectionGridTransform('right')).toBe('rotate(-90deg)')
        expect(moveDirectionGridTransform('down')).toBe('rotate(180deg)')
        expect(moveDirectionGridTransform('left')).toBe('rotate(90deg)')
    })

    it('orientMoveRule rotates offset and keeps variants', () => {
        const rule = createDefaultMoveRule(0, 2)
        const oriented = orientMoveRule(rule, 'right')

        expect(oriented.x).toBe(-2)
        expect(oriented.y).toBe(0)
        expect(oriented.empty.enabled).toBe(true)
    })

    it('isFigureMoveAllowed applies team moveDirection right', () => {
        const from = { i: 1, j: 0 }
        const actor = createFigurePlacement('rook')
        const figures = pushToStack(emptyFiguresSlice(), from, actor)

        const definition = makeDefinition([createDefaultMoveRule(0, 1)], { team: 0 })
        const catalog = [definition]
        const boardParameters = {
            ...testBoardParameters,
            teamMoveDirections: { 0: 'right' as const },
        }

        expect(isFigureMoveAllowed(
            from,
            { i: 0, j: 0 },
            definition,
            figures.figuresByCoord,
            boardParameters,
            actor,
            catalog,
        )).toBe(true)
    })
})
