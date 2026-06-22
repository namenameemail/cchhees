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

    it('preserves moveDirection when normalizing teams', () => {
        expect(normalizeFigureTeams([
            { id: 0, name: 'White', moveDirection: 'right' },
            { id: 1, name: 'Black', moveDirection: 'up' },
        ])).toEqual([
            { id: 0, name: 'White', moveDirection: 'right' },
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

    it('infers moveDirection from catalog figures', () => {
        const catalogWithDirection: FigureCatalog = [
            { id: 'A', states: [{ viewParams: {} }], team: 0, moveDirection: 'right' },
        ]

        expect(migrateFigureTeamsFromCatalog(catalogWithDirection)).toEqual([
            { id: 0, name: defaultTeamName(0), moveDirection: 'right' },
        ])
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
