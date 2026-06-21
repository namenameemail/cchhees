import { describe, expect, it } from 'vitest'
import { FigureEventType } from '../types/events'
import { testBoardParameters } from '../testFixtures'
import { migrateBoardAndCatalogEventRules } from './boardEventRules'

describe('migrateBoardAndCatalogEventRules', () => {
    it('collects catalog eventRules into board when board has none', () => {
        const ruleA = {
            id: 'a',
            type: FigureEventType.onMove,
            params: { cause: 'any' as const },
            conditions: [],
            actions: [],
        }
        const ruleB = {
            id: 'b',
            type: FigureEventType.steppedOnBy,
            params: { cause: 'any' as const },
            conditions: [],
            actions: [],
        }

        const { board, catalog } = migrateBoardAndCatalogEventRules(
            {
                boardParameters: testBoardParameters,
                styleRules: [],
                cellParametersByCoord: {},
            },
            [
                { id: 'pawn', states: [{ viewParams: {} }], eventRules: [ruleA] },
                { id: 'rook', states: [{ viewParams: {} }], eventRules: [ruleB] },
            ],
        )

        expect(board.eventRules?.map(rule => rule.id)).toEqual(['a', 'b'])
        expect(catalog.every(entry => !entry.eventRules?.length)).toBe(true)
    })

    it('dedupes colliding rule ids from catalog', () => {
        const rule = {
            id: 'dup',
            type: FigureEventType.onMove,
            params: { cause: 'any' as const },
            conditions: [],
            actions: [],
        }

        const { board } = migrateBoardAndCatalogEventRules(
            {
                boardParameters: testBoardParameters,
                styleRules: [],
                cellParametersByCoord: {},
            },
            [
                { id: 'a', states: [{ viewParams: {} }], eventRules: [rule] },
                { id: 'b', states: [{ viewParams: {} }], eventRules: [{ ...rule }] },
            ],
        )

        expect(board.eventRules?.length).toBe(2)
        expect(new Set(board.eventRules?.map(item => item.id)).size).toBe(2)
    })
})
