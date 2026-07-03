import {
    FigureEventCondition,
    FigureEventFigureFilter,
    FigureEventRule,
    GameAction,
    GameActionType,
    SpawnFigureActionParams,
    SpawnFigureNearbyActionParams,
} from '../types/events'
import { FigureCatalog, FigureId, FigurePlacement } from '../types/figures'
import { canonicalizeConditionSubjectEntries, canonicalizeFigureFilterArray, isConcreteFigureFilter } from '../figureFilter'
import { cloneFigurePlacement, normalizeFigureEventRule } from '../figureView'
import { cloneFiguresByCoord } from '../figureStack'
import { FiguresSlice } from './slices'

export function getFigureCatalogIds(catalog: FigureCatalog): Set<FigureId> {
    return new Set(catalog.map(entry => entry.id))
}

export function removeFigureFromBoard(figures: FiguresSlice, figureId: FigureId): FiguresSlice {
    const figuresByCoord: FiguresSlice['figuresByCoord'] = {}

    for (const [key, stack] of Object.entries(figures.figuresByCoord)) {
        const filtered = stack.filter(placement => placement.figureId !== figureId)

        if (filtered.length > 0) {
            figuresByCoord[key] = filtered
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(placement => placement.figureId !== figureId),
    }
}

export function pruneFigureReferences(figures: FiguresSlice, catalog: FigureCatalog): FiguresSlice {
    const validIds = getFigureCatalogIds(catalog)
    const figuresByCoord: FiguresSlice['figuresByCoord'] = {}

    for (const [key, stack] of Object.entries(figures.figuresByCoord)) {
        const filtered = stack.filter(placement => validIds.has(placement.figureId))

        if (filtered.length > 0) {
            figuresByCoord[key] = filtered
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(placement => validIds.has(placement.figureId)),
    }
}

export function cloneFiguresSlicePlacements(figures: FiguresSlice): FiguresSlice {
    return {
        figuresByCoord: cloneFiguresByCoord(figures.figuresByCoord),
        tray: figures.tray.map(cloneFigurePlacement),
    }
}

function scrubConditionReferences(
    condition: FigureEventCondition,
    removedFigureId: FigureId,
): FigureEventCondition {
    const subject = {
        ...condition.subject,
        entries: canonicalizeConditionSubjectEntries(
            condition.subject.entries.filter(entry => (
                !isConcreteFigureFilter(entry.figureId)
                || entry.figureId !== removedFigureId
            )),
        ),
    }

    const params = condition.params as Record<string, unknown> | undefined
    if (!params) {
        return { ...condition, subject }
    }

    const scrubFilters = (key: string) => {
        const list = params[key] as FigureEventFigureFilter[] | undefined
        if (!list?.length) {
            return
        }

        params[key] = canonicalizeFigureFilterArray(
            list.filter(entry => (
                !isConcreteFigureFilter(entry.figureId)
                || entry.figureId !== removedFigureId
            )),
        )
    }

    scrubFilters('figures')
    scrubFilters('stepperFigures')
    scrubFilters('anchorFigures')

    return { ...condition, subject, params: params as FigureEventCondition['params'] }
}

function scrubActionReferences(action: GameAction, removedFigureId: FigureId): GameAction | null {
    if (action.type === GameActionType.spawnFigure) {
        const params = action.params as SpawnFigureActionParams

        if (params.figureId === removedFigureId) {
            return null
        }

        return action
    }

    if (action.type === GameActionType.spawnFigureNearby) {
        const params = action.params as SpawnFigureNearbyActionParams

        if (params.figureId === removedFigureId) {
            return null
        }

        return action
    }

    if (!action.subject?.entries?.length) {
        return action
    }

    return {
        ...action,
        subject: {
            ...action.subject,
            entries: canonicalizeConditionSubjectEntries(
                action.subject.entries.filter(entry => (
                    !isConcreteFigureFilter(entry.figureId)
                    || entry.figureId !== removedFigureId
                )),
            ),
        },
    }
}

function scrubEventRuleReferences(rule: FigureEventRule, removedFigureId: FigureId): FigureEventRule {
    const conditions = (rule.conditions ?? []).map(condition => (
        scrubConditionReferences(condition, removedFigureId)
    ))

    const actions = (rule.actions ?? [])
        .map(action => scrubActionReferences(action, removedFigureId))
        .filter((action): action is GameAction => action !== null)

    return {
        ...rule,
        conditions,
        actions,
    }
}

export function removeFigureReferencesFromBoardEventRules(
    board: { eventRules?: FigureEventRule[] },
    removedFigureId: FigureId,
): FigureEventRule[] | undefined {
    if (!board.eventRules?.length) {
        return board.eventRules
    }

    return board.eventRules
        .map(rule => scrubEventRuleReferences(rule, removedFigureId))
        .map(rule => normalizeFigureEventRule(rule))
        .filter((rule): rule is FigureEventRule => rule !== null)
}
