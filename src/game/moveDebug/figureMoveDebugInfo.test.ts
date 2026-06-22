import { describe, expect, it } from 'vitest'
import { buildFigureMoveDebugInfo, formatMoveRulesBrief } from './figureMoveDebugInfo'
import { createFigurePlacement } from '../figureView'

describe('figureMoveDebugInfo', () => {
    it('buildFigureMoveDebugInfo includes move rules and flags', () => {
        const catalog = [{
            id: 'pawn',
            team: 0,
            moveDirection: 'up' as const,
            states: [{
                viewParams: {},
                moveRules: [{ x: 0, y: 1, n: 2, landing: 'empty' as const }],
                jumpOverPieces: false,
                canStepOnOwnTeam: false,
                canJumpOverOwnTeam: false,
            }],
        }]

        const info = buildFigureMoveDebugInfo(catalog, createFigurePlacement('pawn', 0))

        expect(info).toEqual({
            figureId: 'pawn',
            stateIndex: 0,
            team: 0,
            moveDirection: 'up',
            jumpOverPieces: false,
            canStepOnOwnTeam: false,
            canJumpOverOwnTeam: false,
            moveRules: [{ x: 0, y: 1, n: 2, landing: 'empty' }],
        })
    })

    it('formatMoveRulesBrief renders rules', () => {
        expect(formatMoveRulesBrief([])).toBe('free')
        expect(formatMoveRulesBrief([{ x: 0, y: 2, landing: 'empty' }])).toBe('(0,2,n=1,empty)')
    })
})
