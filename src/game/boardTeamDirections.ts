import { FigureCatalog, FigureMoveDirection, FigureTeams } from './types/figures'
import { BoardParameters } from './types/boardParameters'
import { normalizeFigureMoveDirection, normalizeFigureTeam } from './figureView'

export type BoardTeamMoveDirections = Partial<Record<number, FigureMoveDirection>>

export function normalizeTeamMoveDirections(
    directions: unknown,
): BoardTeamMoveDirections | undefined {
    if (!directions || typeof directions !== 'object') {
        return undefined
    }

    const result: BoardTeamMoveDirections = {}

    for (const [key, value] of Object.entries(directions as Record<string, unknown>)) {
        const teamId = Number(key)

        if (!Number.isInteger(teamId) || teamId < 0) {
            continue
        }

        const moveDirection = normalizeFigureMoveDirection(value)

        if (moveDirection !== 'up') {
            result[teamId] = moveDirection
        }
    }

    return Object.keys(result).length > 0 ? result : undefined
}

function inferTeamMoveDirectionsFromCatalog(catalog: FigureCatalog): BoardTeamMoveDirections {
    const result: BoardTeamMoveDirections = {}

    for (const entry of catalog) {
        const teamId = normalizeFigureTeam(entry.team)

        if (teamId === undefined || result[teamId] !== undefined) {
            continue
        }

        const direction = normalizeFigureMoveDirection(entry.moveDirection)

        if (direction !== 'up') {
            result[teamId] = direction
        }
    }

    return result
}

function inferTeamMoveDirectionsFromFigureTeams(figureTeams: FigureTeams | undefined): BoardTeamMoveDirections {
    const result: BoardTeamMoveDirections = {}

    for (const team of figureTeams ?? []) {
        const direction = normalizeFigureMoveDirection(team.moveDirection)

        if (direction !== 'up') {
            result[team.id] = direction
        }
    }

    return result
}

export function migrateBoardTeamMoveDirections(
    boardParameters: BoardParameters,
    figureTeams?: FigureTeams,
    catalog?: FigureCatalog,
): BoardParameters {
    const normalizedExisting = normalizeTeamMoveDirections(boardParameters.teamMoveDirections)

    if (normalizedExisting) {
        return {
            ...boardParameters,
            teamMoveDirections: normalizedExisting,
        }
    }

    const fromTeams = inferTeamMoveDirectionsFromFigureTeams(figureTeams)
    const fromCatalog = inferTeamMoveDirectionsFromCatalog(catalog ?? [])
    const merged: BoardTeamMoveDirections = { ...fromCatalog, ...fromTeams }
    const normalized = normalizeTeamMoveDirections(merged)

    if (!normalized) {
        return boardParameters
    }

    return {
        ...boardParameters,
        teamMoveDirections: normalized,
    }
}

export function resolveBoardTeamMoveDirection(
    boardParameters: BoardParameters | undefined,
    teamId: number | undefined,
    legacyFigureTeams?: FigureTeams,
): FigureMoveDirection | undefined {
    if (teamId === undefined) {
        return undefined
    }

    const fromBoard = normalizeTeamMoveDirections(boardParameters?.teamMoveDirections)?.[teamId]

    if (fromBoard) {
        return fromBoard
    }

    const legacyTeam = legacyFigureTeams?.find(entry => entry.id === teamId)

    if (!legacyTeam?.moveDirection) {
        return undefined
    }

    const legacyDirection = normalizeFigureMoveDirection(legacyTeam.moveDirection)

    return legacyDirection === 'up' ? undefined : legacyDirection
}

export function patchBoardTeamMoveDirection(
    boardParameters: BoardParameters,
    teamId: number,
    moveDirection: FigureMoveDirection,
): BoardParameters {
    const normalizedDirection = normalizeFigureMoveDirection(moveDirection)
    const current = normalizeTeamMoveDirections(boardParameters.teamMoveDirections) ?? {}
    const next: BoardTeamMoveDirections = { ...current }

    if (normalizedDirection === 'up') {
        delete next[teamId]
    } else {
        next[teamId] = normalizedDirection
    }

    const normalized = normalizeTeamMoveDirections(next)

    return {
        ...boardParameters,
        teamMoveDirections: normalized,
    }
}
