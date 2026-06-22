import {
    FigureCatalog,
    FigureId,
    FigureMoveDirection,
    FigureTeam,
    FigureTeams,
} from './types/figures'
import { normalizeFigureMoveDirection, normalizeFigureTeam } from './figureView'

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

        const moveDirection = normalizeFigureMoveDirection((entry as FigureTeam).moveDirection)
        const team: FigureTeam = { id, name }

        if (moveDirection !== 'up') {
            team.moveDirection = moveDirection
        }

        seen.add(id)
        result.push(team)
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

    for (const [id, team] of byId) {
        if (team.moveDirection !== undefined) {
            continue
        }

        const inferred = inferTeamMoveDirectionFromCatalog(catalog, id)

        if (inferred !== 'up') {
            byId.set(id, { ...team, moveDirection: inferred })
        }
    }

    return [...byId.values()].sort((a, b) => a.id - b.id)
}

function inferTeamMoveDirectionFromCatalog(catalog: FigureCatalog, teamId: number): FigureMoveDirection {
    for (const entry of catalog) {
        if (normalizeFigureTeam(entry.team) !== teamId) {
            continue
        }

        const direction = normalizeFigureMoveDirection(entry.moveDirection)

        if (direction !== 'up') {
            return direction
        }
    }

    return 'up'
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
    teams: FigureTeams | undefined,
    teamId: number | undefined,
): FigureMoveDirection | undefined {
    if (teamId === undefined || !teams) {
        return undefined
    }

    const team = teams.find(entry => entry.id === teamId)

    if (!team?.moveDirection) {
        return undefined
    }

    return normalizeFigureMoveDirection(team.moveDirection)
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
