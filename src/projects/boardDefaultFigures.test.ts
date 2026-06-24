import { describe, expect, it } from 'vitest'
import { createEmptyBoardDocument } from './boardDocument'
import {
    compareFiguresSlices,
    countFiguresOnBoard,
    emptyFiguresSlice,
    getBoardDefaultFigures,
} from './boardDefaultFigures'

describe('boardDefaultFigures', () => {
    it('returns empty slice when defaultFigures is undefined', () => {
        const board = createEmptyBoardDocument('test')

        expect(getBoardDefaultFigures(board)).toEqual(emptyFiguresSlice())
    })

    it('clones saved defaultFigures on read', () => {
        const board = createEmptyBoardDocument('test')
        board.defaultFigures = {
            figuresByCoord: {
                '1,1': [{
                    instanceId: 'a',
                    figureId: 'pawn',
                    stateIndex: 0,
                }],
            },
            tray: [{
                instanceId: 'b',
                figureId: 'rook',
                stateIndex: 1,
            }],
        }

        const resolved = getBoardDefaultFigures(board)

        expect(resolved.figuresByCoord['1,1']?.[0]?.figureId).toBe('pawn')
        expect(resolved.tray[0]?.figureId).toBe('rook')
        expect(resolved.tray[0]?.stateIndex).toBe(1)
        expect(resolved).not.toBe(board.defaultFigures)
        expect(resolved.figuresByCoord['1,1']).not.toBe(board.defaultFigures!.figuresByCoord['1,1'])
    })

    it('counts figures on board and in tray', () => {
        const counts = countFiguresOnBoard({
            figuresByCoord: {
                '1,1': [
                    { instanceId: 'a', figureId: 'pawn', stateIndex: 0 },
                    { instanceId: 'b', figureId: 'pawn', stateIndex: 0 },
                ],
            },
            tray: [{ instanceId: 'c', figureId: 'rook', stateIndex: 0 }],
        })

        expect(counts).toEqual({ onBoard: 2, inTray: 1 })
    })

    it('compares board and tray when checking equality', () => {
        const left = {
            figuresByCoord: {
                '1,1': [{ instanceId: 'a', figureId: 'pawn', stateIndex: 0 }],
            },
            tray: [{ instanceId: 'b', figureId: 'rook', stateIndex: 0 }],
        }
        const right = {
            figuresByCoord: {
                '1,1': [{ instanceId: 'x', figureId: 'pawn', stateIndex: 0 }],
            },
            tray: [],
        }

        expect(compareFiguresSlices(left, right)).toBe(false)
    })
})
