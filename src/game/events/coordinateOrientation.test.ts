import { describe, expect, it } from 'vitest'
import { isInsideOrientedRect, orientBoardAreaCorner } from './coordinateOrientation'
import { BoardParameters } from '../types/boardParameters'
import { FigureCatalog } from '../types/figures'
import { testBoardParameters } from '../testFixtures'

// Non-square board so left/right formulas can't accidentally pass by using the wrong axis (n vs m).
const board: BoardParameters = { ...testBoardParameters, n: 8, m: 5 }

const catalog: FigureCatalog = [
    { id: 'up', moveDirection: 'up', states: [{ viewParams: {} }] },
    { id: 'down', moveDirection: 'down', states: [{ viewParams: {} }] },
    { id: 'left', moveDirection: 'left', states: [{ viewParams: {} }] },
    { id: 'right', moveDirection: 'right', states: [{ viewParams: {} }] },
]

describe('orientBoardAreaCorner', () => {
    it('up is identity', () => {
        expect(orientBoardAreaCorner(1, 1, 'up', board)).toEqual({ x: 1, y: 1 })
        expect(orientBoardAreaCorner(3, 2, 'up', board)).toEqual({ x: 3, y: 2 })
    })

    it('down reflects both axes using n and m respectively', () => {
        expect(orientBoardAreaCorner(1, 1, 'down', board)).toEqual({ x: 8, y: 5 })
        expect(orientBoardAreaCorner(3, 2, 'down', board)).toEqual({ x: 6, y: 4 })
    })

    it('left swaps axes (forward y -> i, lateral x -> reflected j)', () => {
        expect(orientBoardAreaCorner(1, 1, 'left', board)).toEqual({ x: 1, y: 5 })
        expect(orientBoardAreaCorner(3, 2, 'left', board)).toEqual({ x: 2, y: 3 })
    })

    it('right swaps axes the other way', () => {
        expect(orientBoardAreaCorner(1, 1, 'right', board)).toEqual({ x: 8, y: 1 })
        expect(orientBoardAreaCorner(3, 2, 'right', board)).toEqual({ x: 7, y: 3 })
    })
})

describe('isInsideOrientedRect for inBoardArea (absolute area, rotated by team direction)', () => {
    const rect = { x1: 1, y1: 1, x2: 3, y2: 3 }

    it('unoriented: absolute rect, unaffected by any figure', () => {
        expect(isInsideOrientedRect({ i: 1, j: 1 }, rect, false, catalog, 'up', board)).toBe(true)
        expect(isInsideOrientedRect({ i: 5, j: 5 }, rect, false, catalog, 'up', board)).toBe(false)
    })

    it('oriented + up: identical to unoriented (canonical direction)', () => {
        expect(isInsideOrientedRect({ i: 0, j: 0 }, rect, true, catalog, 'up', board)).toBe(true)
        expect(isInsideOrientedRect({ i: 4, j: 4 }, rect, true, catalog, 'up', board)).toBe(false)
    })

    it('oriented + down: mirrored to the opposite board corner, independent of figure position', () => {
        // corner1 (1,1)->(8,5), corner2 (3,3)->(6,3) => absolute box x:[6,8] y:[3,5] (1-based) => i:[5,7] j:[2,4]
        expect(isInsideOrientedRect({ i: 7, j: 4 }, rect, true, catalog, 'down', board)).toBe(true)
        expect(isInsideOrientedRect({ i: 0, j: 0 }, rect, true, catalog, 'down', board)).toBe(false)
    })

    it('does not depend on where the figure came from — same absolute area regardless of "anchor"', () => {
        // Old (buggy) behavior anchored the rect to the figure's own pre-move coord;
        // the fixed behavior must give the same answer no matter what coord the figure is "coming from".
        const a = isInsideOrientedRect({ i: 7, j: 4 }, rect, true, catalog, 'down', board)
        const b = isInsideOrientedRect({ i: 7, j: 4 }, rect, true, catalog, 'down', board)
        expect(a).toBe(b)
        expect(a).toBe(true)
    })

    it('falls back to unoriented comparison when boardParameters is missing', () => {
        expect(isInsideOrientedRect({ i: 1, j: 1 }, rect, true, catalog, 'down', undefined)).toBe(true)
    })
})
