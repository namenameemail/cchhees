import { describe, expect, it } from 'vitest'
import { FigureCatalog } from './types/figures'
import {
    applyTeamMembersToCatalog,
    defaultTeamName,
    getFiguresForTeam,
    migrateFigureTeamsFromCatalog,
    nextTeamId,
    normalizeFigureTeams,
} from './figureTeams'
import {
    migrateBoardTeamMoveDirections,
    normalizeTeamMoveDirections,
    patchBoardTeamMoveDirection,
    resolveBoardTeamMoveDirection,
} from './boardTeamDirections'

const catalog: FigureCatalog = [
    { id: 'A', states: [{ viewParams: {} }], team: 0 },
    { id: 'B', states: [{ viewParams: {} }], team: 1 },
    { id: 'C', states: [{ viewParams: {} }] },
]

describe('normalizeFigureTeams', () => {
    it('deduplicates and sorts teams', () => {
        expect(normalizeFigureTeams([
            { id: 1, name: 'Black' },
            { id: 0, name: 'White' },
            { id: 1, name: 'Duplicate' },
            { id: 2, name: '' },
        ])).toEqual([
            { id: 0, name: 'White' },
            { id: 1, name: 'Black' },
        ])
    })

    it('strips moveDirection from teams', () => {
        expect(normalizeFigureTeams([
            { id: 0, name: 'White', moveDirection: 'right' },
            { id: 1, name: 'Black', moveDirection: 'up' },
        ])).toEqual([
            { id: 0, name: 'White' },
            { id: 1, name: 'Black' },
        ])
    })
})

describe('migrateFigureTeamsFromCatalog', () => {
    it('creates default teams from catalog membership', () => {
        expect(migrateFigureTeamsFromCatalog(catalog)).toEqual([
            { id: 0, name: defaultTeamName(0) },
            { id: 1, name: defaultTeamName(1) },
        ])
    })

    it('keeps existing names for known ids', () => {
        expect(migrateFigureTeamsFromCatalog(catalog, [{ id: 0, name: 'White' }])).toEqual([
            { id: 0, name: 'White' },
            { id: 1, name: defaultTeamName(1) },
        ])
    })
})

describe('board team directions', () => {
    it('migrates legacy team moveDirection to board parameters', () => {
        const boardParameters = { n: 8, m: 8 } as never
        const figureTeams = [{ id: 0, name: 'White', moveDirection: 'right' as const }]

        expect(migrateBoardTeamMoveDirections(boardParameters, figureTeams)).toEqual({
            n: 8,
            m: 8,
            teamMoveDirections: { 0: 'right' },
        })
    })

    it('resolves direction from board parameters', () => {
        const boardParameters = {
            n: 8,
            m: 8,
            teamMoveDirections: { 0: 'left' },
        } as never

        expect(resolveBoardTeamMoveDirection(boardParameters, 0)).toBe('left')
        expect(resolveBoardTeamMoveDirection(boardParameters, 1)).toBeUndefined()
    })

    it('patches team direction on board', () => {
        const boardParameters = { n: 8, m: 8 } as never

        expect(patchBoardTeamMoveDirection(boardParameters, 0, 'down')).toEqual({
            n: 8,
            m: 8,
            teamMoveDirections: { 0: 'down' },
        })

        expect(patchBoardTeamMoveDirection(
            patchBoardTeamMoveDirection(boardParameters, 0, 'down'),
            0,
            'up',
        )).toEqual({
            n: 8,
            m: 8,
        })
    })

    it('normalizes teamMoveDirections map', () => {
        expect(normalizeTeamMoveDirections({ 0: 'right', 1: 'up', x: 'left' })).toEqual({
            0: 'right',
        })
    })
})

describe('nextTeamId', () => {
    it('returns 0 for empty list', () => {
        expect(nextTeamId([])).toBe(0)
    })

    it('returns max + 1', () => {
        expect(nextTeamId([
            { id: 0, name: 'A' },
            { id: 2, name: 'B' },
        ])).toBe(3)
    })
})

describe('applyTeamMembersToCatalog', () => {
    it('assigns and clears team membership exclusively', () => {
        const next = applyTeamMembersToCatalog(catalog, 0, ['B', 'C'])

        expect(getFiguresForTeam(next, 0)).toEqual(['B', 'C'])
        expect(next.find(entry => entry.id === 'C')?.team).toBe(0)
    })
})
