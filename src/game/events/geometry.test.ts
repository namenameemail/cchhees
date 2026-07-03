import { describe, expect, it } from 'vitest'
import { evaluateByMovePhase, isNewlyInArea } from './geometry'

describe('evaluateByMovePhase', () => {
    const cases: Array<{
        movePhase: 'before' | 'after' | 'entered' | 'left' | undefined
        before: boolean
        after: boolean
        expected: boolean
    }> = [
        { movePhase: 'before', before: true, after: false, expected: true },
        { movePhase: 'before', before: false, after: true, expected: false },
        { movePhase: 'after', before: false, after: true, expected: true },
        { movePhase: 'after', before: true, after: false, expected: false },
        { movePhase: undefined, before: true, after: true, expected: true },
        { movePhase: 'entered', before: false, after: true, expected: true },
        { movePhase: 'entered', before: true, after: true, expected: false },
        { movePhase: 'entered', before: false, after: false, expected: false },
        { movePhase: 'entered', before: true, after: false, expected: false },
        { movePhase: 'left', before: true, after: false, expected: true },
        { movePhase: 'left', before: true, after: true, expected: false },
        { movePhase: 'left', before: false, after: false, expected: false },
        { movePhase: 'left', before: false, after: true, expected: false },
    ]

    for (const { movePhase, before, after, expected } of cases) {
        it(`movePhase=${movePhase} before=${before} after=${after} -> ${expected}`, () => {
            const computeAt = (which: 'before' | 'after') => (which === 'before' ? before : after)
            expect(evaluateByMovePhase(movePhase, computeAt)).toBe(expected)
        })
    }
})

describe('isNewlyInArea (thin wrapper over evaluateByMovePhase entered)', () => {
    const anchor = { i: 0, j: 0 }
    const cells = [{ x: 1, y: 0 }]

    it('is true when after is inside and before was outside', () => {
        expect(isNewlyInArea({ i: 1, j: 0 }, { i: 5, j: 5 }, anchor, anchor, cells)).toBe(true)
    })

    it('is false when already inside before the move', () => {
        expect(isNewlyInArea({ i: 1, j: 0 }, { i: 1, j: 0 }, anchor, anchor, cells)).toBe(false)
    })

    it('is false when not inside after the move', () => {
        expect(isNewlyInArea({ i: 5, j: 5 }, { i: 9, j: 9 }, anchor, anchor, cells)).toBe(false)
    })
})
