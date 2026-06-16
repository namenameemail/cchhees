import { describe, expect, it } from 'vitest'
import { compareFigureBoards, emptyFiguresSlice } from './compareFigureBoards'
import { createFigurePlacement } from '../figureView'
import { pushToStack } from '../figureStack'

describe('compareFigureBoards', () => {
    it('reports match for identical boards', () => {
        const placement = createFigurePlacement('pawn', 0)
        const slice = pushToStack(emptyFiguresSlice(), { i: 1, j: 1 }, placement)

        expect(compareFigureBoards(slice, slice).match).toBe(true)
    })

    it('detects missing and extra placements', () => {
        const expected = pushToStack(emptyFiguresSlice(), { i: 0, j: 0 }, createFigurePlacement('pawn'))
        const actual = pushToStack(emptyFiguresSlice(), { i: 1, j: 1 }, createFigurePlacement('rook'))

        const result = compareFigureBoards(actual, expected)

        expect(result.match).toBe(false)
        expect(result.mismatches.some(item => item.kind === 'missing')).toBe(true)
        expect(result.mismatches.some(item => item.kind === 'extra')).toBe(true)
    })

    it('detects wrong state index', () => {
        const coord = { i: 2, j: 2 }
        const expected = pushToStack(emptyFiguresSlice(), coord, createFigurePlacement('pawn', 0))
        const actual = pushToStack(emptyFiguresSlice(), coord, createFigurePlacement('pawn', 1))

        const result = compareFigureBoards(actual, expected)

        expect(result.match).toBe(false)
        expect(result.mismatches.some(item => item.kind === 'wrongState')).toBe(true)
    })
})
