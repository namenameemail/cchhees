import {
    FigureCatalog,
    FigureMoveRule,
    FigureMoveDirection,
    FigurePlacement,
} from '../types/figures'
import {
    normalizeFigureMoveRules,
    normalizeFigureTeam,
    resolveFigureDefinition,
    resolveFigureMoveDirection,
    resolveFigureState,
    resolvePlacementStateIndex,
} from '../figureView'
import { resolveCanStepOnOwnTeam, resolveJumpOverPieces } from '../moveRules'

export interface FigureMoveDebugInfo {
    figureId: string
    stateIndex: number
    team?: number
    moveDirection: FigureMoveDirection
    jumpOverPieces: boolean
    canStepOnOwnTeam: boolean
    moveRules: FigureMoveRule[]
}

export function buildFigureMoveDebugInfo(
    catalog: FigureCatalog,
    placement: FigurePlacement,
): FigureMoveDebugInfo {
    const definition = resolveFigureDefinition(placement.figureId, catalog)
    const stateIndex = resolvePlacementStateIndex(placement)
    const state = resolveFigureState(definition, stateIndex)
    const team = normalizeFigureTeam(definition.team)

    return {
        figureId: placement.figureId,
        stateIndex,
        ...(team !== undefined ? { team } : {}),
        moveDirection: resolveFigureMoveDirection(definition),
        jumpOverPieces: resolveJumpOverPieces(state),
        canStepOnOwnTeam: resolveCanStepOnOwnTeam(state),
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

    return `${info.figureId}#${info.stateIndex}${teamPart} dir=${info.moveDirection}${jumpPart}${ownTeamPart}`
        + ` rules=${formatMoveRulesBrief(info.moveRules)}`
}
