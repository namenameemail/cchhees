import { describe, expect, it } from 'vitest'
import {
    createDefaultMoveRule,
    migrateLegacyMoveRules,
} from './migrateFigureMoveRules'
import { normalizeFigureMoveRules } from './figureView'

import type { LegacyFigureMoveRule } from './types/figures'

describe('migrateFigureMoveRules', () => {
    it('migrates legacy landing empty', () => {
        const rules = migrateLegacyMoveRules([{ x: 1, y: 0, n: 2, landing: 'empty' }])

        expect(rules).toHaveLength(1)
        expect(rules[0]?.empty).toEqual({ enabled: true, length: 2, conditions: [] })
        expect(rules[0]?.capture.enabled).toBe(false)
    })

    it('migrates legacy landing any to empty and capture', () => {
        const rules = migrateLegacyMoveRules([{ x: 0, y: 1, landing: 'any' }])

        expect(rules[0]?.empty.enabled).toBe(true)
        expect(rules[0]?.capture.enabled).toBe(true)
    })

    it('applies global canStepOnOwnTeam to capture variant', () => {
        const rules = migrateLegacyMoveRules(
            [{ x: 1, y: 0, landing: 'capture' }],
            { canStepOnOwnTeam: true },
        )

        expect(rules[0]?.capture.allowOwnTeam).toBe(true)
    })

    it('applies global canJumpOverOwnTeam to jumpOver variant', () => {
        const rules = migrateLegacyMoveRules(
            [{ x: 0, y: 2, landing: 'jumpOver' }],
            { canJumpOverOwnTeam: true },
        )

        expect(rules[0]?.jumpOver.allowOwnTeam).toBe(true)
    })

    it('createDefaultMoveRule matches click defaults', () => {
        const rule = createDefaultMoveRule(2, -1)

        expect(rule).toEqual({
            x: 2,
            y: -1,
            empty: { enabled: true, length: 1, conditions: [] },
            capture: { enabled: true, length: 1, allowOwnTeam: false, conditions: [] },
            jumpOver: { enabled: false, length: 1, allowOwnTeam: false, approach: 1, landing: 1, conditions: [] },
        })
    })

    it('normalizeFigureMoveRules migrates legacy rook offsets', () => {
        const rules = normalizeFigureMoveRules([
            { x: 1, y: 0 },
            { x: 0, y: 1 },
        ] as unknown as Parameters<typeof normalizeFigureMoveRules>[0])

        expect(rules).toHaveLength(2)
        expect(rules[0]?.empty.enabled).toBe(true)
        expect(rules[0]?.capture.enabled).toBe(true)
    })
})
