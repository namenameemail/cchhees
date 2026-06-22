import {
    FigureCatalog,
    FigureId,
    FigureMoveDirection,
    FigureTeam,
    FigureTeams,
} from './types/figures'
import { BoardParameters } from './types/boardParameters'
import {
    migrateBoardTeamMoveDirections,
    resolveBoardTeamMoveDirection,
} from './boardTeamDirections'
import { normalizeFigureTeam } from './figureView'

export { migrateBoardTeamMoveDirections }

export const FIGURE_MOVE_DIRECTION_OPTIONS: Array<{ id: FigureMoveDirection; label: string }> = [
    { id: 'up', label: 'вверх' },
    { id: 'down', label: 'вниз' },
    { id: 'left', label: 'влево' },
    { id: 'right', label: 'вправо' },
]

export function normalizeFigureTeams(teams: unknown): FigureTeams {
    if (!Array.isArray(teams)) {
        return []
    }

    const seen = new Set<number>()
    const result: FigureTeams = []

    for (const entry of teams) {
        if (!entry || typeof entry !== 'object') {
            continue
        }

        const id = normalizeFigureTeam((entry as FigureTeam).id)
        const name = typeof (entry as FigureTeam).name === 'string'
            ? (entry as FigureTeam).name.trim()
            : ''

        if (id === undefined || seen.has(id) || !name) {
            continue
        }

        seen.add(id)
        result.push({ id, name })
    }

    return result.sort((a, b) => a.id - b.id)
}

export function defaultTeamName(teamId: number): string {
    return `Команда ${teamId}`
}

export function collectTeamIdsFromCatalog(catalog: FigureCatalog): number[] {
    const ids = new Set<number>()

    for (const entry of catalog) {
        const team = normalizeFigureTeam(entry.team)

        if (team !== undefined) {
            ids.add(team)
        }
    }

    return [...ids].sort((a, b) => a - b)
}

export function migrateFigureTeamsFromCatalog(
    catalog: FigureCatalog,
    teams?: FigureTeams,
): FigureTeams {
    const normalized = normalizeFigureTeams(teams)
    const byId = new Map(normalized.map(team => [team.id, team]))
    const catalogTeamIds = collectTeamIdsFromCatalog(catalog)

    for (const id of catalogTeamIds) {
        if (!byId.has(id)) {
            byId.set(id, { id, name: defaultTeamName(id) })
        }
    }

    return [...byId.values()].sort((a, b) => a.id - b.id)
}

export function nextTeamId(teams: FigureTeams): number {
    if (teams.length === 0) {
        return 0
    }

    return Math.max(...teams.map(team => team.id)) + 1
}

export function getFiguresForTeam(catalog: FigureCatalog, teamId: number): FigureId[] {
    return catalog
        .filter(entry => normalizeFigureTeam(entry.team) === teamId)
        .map(entry => entry.id)
}

export function applyTeamMembersToCatalog(
    catalog: FigureCatalog,
    teamId: number,
    figureIds: FigureId[],
): FigureCatalog {
    const targetIds = new Set(figureIds)

    return catalog.map(entry => {
        const currentTeam = normalizeFigureTeam(entry.team)
        const shouldAssign = targetIds.has(entry.id)

        if (shouldAssign) {
            if (currentTeam === teamId) {
                return entry
            }

            return { ...entry, team: teamId }
        }

        if (currentTeam === teamId) {
            const { team: _removed, ...rest } = entry
            return rest
        }

        return entry
    })
}

export function clearTeamFromCatalog(catalog: FigureCatalog, teamId: number): FigureCatalog {
    return applyTeamMembersToCatalog(catalog, teamId, [])
}

export function resolveTeamMoveDirection(
    boardParameters: BoardParameters | undefined,
    teamId: number | undefined,
    legacyFigureTeams?: FigureTeams,
): FigureMoveDirection | undefined {
    return resolveBoardTeamMoveDirection(boardParameters, teamId, legacyFigureTeams)
}

export function resolveTeamSelectOptions(
    teams: FigureTeams,
    catalog: FigureCatalog,
    selectedTeamId?: number,
): FigureTeams {
    const options = [...teams]
    const knownIds = new Set(options.map(team => team.id))

    if (selectedTeamId !== undefined && !knownIds.has(selectedTeamId)) {
        options.push({ id: selectedTeamId, name: defaultTeamName(selectedTeamId) })
    }

    for (const id of collectTeamIdsFromCatalog(catalog)) {
        if (!knownIds.has(id) && id !== selectedTeamId) {
            options.push({ id, name: defaultTeamName(id) })
        }
    }

    return options.sort((a, b) => a.id - b.id)
}
