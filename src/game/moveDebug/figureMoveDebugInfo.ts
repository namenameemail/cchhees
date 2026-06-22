import { FigureCatalog, FigureMoveDirection, FigureMoveRule, FigurePlacement, FigureTeams } from '../types/figures'
import {
    normalizeFigureMoveRules,
    normalizeFigureTeam,
    resolveFigureDefinition,
    resolveFigureMoveDirectionFromCatalog,
    resolveFigureState,
    resolvePlacementStateIndex,
} from '../figureView'
import { resolveCanJumpOverOwnTeam, resolveCanStepOnOwnTeam, resolveJumpOverPieces } from '../moveRules'

export interface FigureMoveDebugInfo {
    figureId: string
    stateIndex: number
    team?: number
    moveDirection: FigureMoveDirection
    jumpOverPieces: boolean
    canStepOnOwnTeam: boolean
    canJumpOverOwnTeam: boolean
    moveRules: FigureMoveRule[]
}

export function buildFigureMoveDebugInfo(
    catalog: FigureCatalog,
    placement: FigurePlacement,
    figureTeams?: FigureTeams,
): FigureMoveDebugInfo {
    const definition = resolveFigureDefinition(placement.figureId, catalog)
    const stateIndex = resolvePlacementStateIndex(placement)
    const state = resolveFigureState(definition, stateIndex)
    const team = normalizeFigureTeam(definition.team)

    return {
        figureId: placement.figureId,
        stateIndex,
        ...(team !== undefined ? { team } : {}),
        moveDirection: resolveFigureMoveDirectionFromCatalog(catalog, placement.figureId, figureTeams),
        jumpOverPieces: resolveJumpOverPieces(state),
        canStepOnOwnTeam: resolveCanStepOnOwnTeam(state),
        canJumpOverOwnTeam: resolveCanJumpOverOwnTeam(state),
        moveRules: normalizeFigureMoveRules(state.moveRules),
    }
}

export function formatMoveRulesBrief(rules: FigureMoveRule[]): string {
    if (rules.length === 0) {
        return 'free'
    }

    return rules.map(rule => {
        const n = rule.n ?? 1
        const landing = rule.landing ?? 'any'

        return `(${rule.x},${rule.y},n=${n},${landing})`
    }).join(';')
}

export function formatFigureMoveDebugBrief(info: FigureMoveDebugInfo): string {
    const teamPart = info.team !== undefined ? ` team=${info.team}` : ''
    const jumpPart = info.jumpOverPieces ? ' jump=1' : ' jump=0'
    const ownTeamPart = info.canStepOnOwnTeam ? ' ownTeam=1' : ' ownTeam=0'
    const jumpOwnTeamPart = info.canJumpOverOwnTeam ? ' jumpOwnTeam=1' : ' jumpOwnTeam=0'

    return `${info.figureId}#${info.stateIndex}${teamPart} dir=${info.moveDirection}${jumpPart}${ownTeamPart}${jumpOwnTeamPart}`
        + ` rules=${formatMoveRulesBrief(info.moveRules)}`
}
