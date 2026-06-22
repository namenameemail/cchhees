import { FigureCatalog, FigureMoveDirection, FigureMoveRule, FigurePlacement, FigureTeams } from '../types/figures'
import { BoardParameters } from '../types/boardParameters'
import {
    normalizeFigureMoveRules,
    normalizeFigureTeam,
    resolveFigureDefinition,
    resolveFigureMoveDirectionFromCatalog,
    resolveFigureState,
    resolvePlacementStateIndex,
} from '../figureView'

export interface FigureMoveDebugInfo {
    figureId: string
    stateIndex: number
    team?: number
    moveDirection: FigureMoveDirection
    moveRules: FigureMoveRule[]
}

export function buildFigureMoveDebugInfo(
    catalog: FigureCatalog,
    placement: FigurePlacement,
    boardParameters?: BoardParameters,
    legacyFigureTeams?: FigureTeams,
): FigureMoveDebugInfo {
    const definition = resolveFigureDefinition(placement.figureId, catalog)
    const stateIndex = resolvePlacementStateIndex(placement)
    const state = resolveFigureState(definition, stateIndex)
    const team = normalizeFigureTeam(definition.team)

    return {
        figureId: placement.figureId,
        stateIndex,
        ...(team !== undefined ? { team } : {}),
        moveDirection: resolveFigureMoveDirectionFromCatalog(
            catalog,
            placement.figureId,
            boardParameters,
            legacyFigureTeams,
        ),
        moveRules: normalizeFigureMoveRules(state.moveRules),
    }
}

function formatVariantBrief(enabled: boolean, length: number, suffix: string): string {
    if (!enabled) {
        return ''
    }

    return `${suffix}${length}`
}

export function formatMoveRulesBrief(rules: FigureMoveRule[]): string {
    if (rules.length === 0) {
        return 'free'
    }

    return rules.map(rule => {
        const parts = [
            formatVariantBrief(rule.empty.enabled, rule.empty.length, 'e'),
            formatVariantBrief(rule.capture.enabled, rule.capture.length, 'c'),
            formatVariantBrief(rule.jumpOver.enabled, rule.jumpOver.length, 'j'),
        ].filter(Boolean).join('+')

        return `(${rule.x},${rule.y}:${parts || '-'})`
    }).join(';')
}

export function formatFigureMoveDebugBrief(info: FigureMoveDebugInfo): string {
    const teamPart = info.team !== undefined ? ` team=${info.team}` : ''

    return `${info.figureId}#${info.stateIndex}${teamPart} dir=${info.moveDirection}`
        + ` rules=${formatMoveRulesBrief(info.moveRules)}`
}
