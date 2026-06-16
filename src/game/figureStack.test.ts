import { describe, expect, it } from 'vitest'
import {
    getCellStack,
    getTopOfStack,
    pushToStack,
    removePlacementFromBoard,
    normalizeStackEntry,
} from './figureStack'
import { createFigurePlacement } from './figureView'
import { coordKey } from './types/coords'
import { Cell } from './types/cells'
import { emptyFiguresSlice } from './moveDebug/compareFigureBoards'

describe('figureStack', () => {
    it('getCellStack prefers figures array over legacy figure', () => {
        const placement = createFigurePlacement('pawn')
        const legacy = createFigurePlacement('rook')

        const cell: Cell = {
            figures: [placement],
            figure: legacy,
        }

        expect(getCellStack(cell)).toEqual([placement])
    })

    it('getCellStack falls back to legacy figure', () => {
        const legacy = createFigurePlacement('rook')
        const cell: Cell = { figure: legacy }

        expect(getCellStack(cell)).toEqual([legacy])
    })

    it('pushToStack and getTopOfStack', () => {
        const bottom = createFigurePlacement('pawn')
        const top = createFigurePlacement('queen')
        let figures = emptyFiguresSlice()

        figures = pushToStack(figures, { i: 1, j: 1 }, bottom)
        figures = pushToStack(figures, { i: 1, j: 1 }, top)

        expect(getTopOfStack(figures, { i: 1, j: 1 })).toEqual(top)
        expect(figures.figuresByCoord[coordKey({ i: 1, j: 1 })]).toHaveLength(2)
    })

    it('removePlacementFromBoard removes matching instance', () => {
        const placement = createFigurePlacement('pawn')
        let figures = pushToStack(emptyFiguresSlice(), { i: 0, j: 0 }, placement)

        figures = removePlacementFromBoard(figures, placement, { i: 0, j: 0 })

        expect(getTopOfStack(figures, { i: 0, j: 0 })).toBeUndefined()
    })

    it('normalizeStackEntry handles single placement and arrays', () => {
        const single = createFigurePlacement('pawn')
        const pair = [createFigurePlacement('rook'), createFigurePlacement('bishop')]

        expect(normalizeStackEntry(single)).toHaveLength(1)
        expect(normalizeStackEntry(pair)).toHaveLength(2)
        expect(normalizeStackEntry(undefined)).toEqual([])
    })
})
