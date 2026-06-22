import { describe, expect, it } from 'vitest'
import { buildFigureMoveDebugInfo, formatMoveRulesBrief } from './figureMoveDebugInfo'
import { createDefaultMoveRule } from '../migrateFigureMoveRules'
import { createFigurePlacement } from '../figureView'
import type { FigureCatalog } from '../types/figures'

describe('figureMoveDebugInfo', () => {
    it('buildFigureMoveDebugInfo normalizes move rules', () => {
        const catalog: FigureCatalog = [{
            id: 'rook',
            states: [{
                viewParams: {},
                moveRules: [{ x: 0, y: 1, n: 2, landing: 'empty' }],
            }],
        }]

        const info = buildFigureMoveDebugInfo(catalog, createFigurePlacement('rook'))

        expect(info.moveRules[0]?.empty.enabled).toBe(true)
        expect(info.moveRules[0]?.empty.length).toBe(2)
    })

    it('formatMoveRulesBrief renders variants', () => {
        const rule = createDefaultMoveRule(0, 2)

        expect(formatMoveRulesBrief([rule])).toBe('(0,2:e1+c1)')
    })
})
