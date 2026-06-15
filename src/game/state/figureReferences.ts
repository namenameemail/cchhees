import { FigureCatalog, FigureId, FigurePlacement } from '../types/figures'
import {
    FigureEventParamsAreaEnteredBy,
    FigureEventParamsEnterFigureArea,
    FigureEventParamsStepOnFigure,
    FigureEventParamsSteppedOnBy,
    FigureEventRule,
    FigureEventType,
    GameAction,
    GameActionType,
    SpawnFigureActionParams,
} from '../types/events'
import { cloneFigurePlacement, normalizeFigureEventRule } from '../figureView'
import {
    canonicalizeFigureFilterArray,
    FIGURE_FILTER_NONE,
    isConcreteFigureFilter,
} from '../figureFilter'
import { FiguresSlice } from './slices'

export function getFigureCatalogIds(catalog: FigureCatalog): Set<FigureId> {
    return new Set(catalog.map(entry => entry.id))
}

export function removeFigureFromBoard(figures: FiguresSlice, figureId: FigureId): FiguresSlice {
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        if (placement.figureId !== figureId) {
            figuresByCoord[key] = placement
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(placement => placement.figureId !== figureId),
    }
}

export function pruneFigureReferences(figures: FiguresSlice, catalog: FigureCatalog): FiguresSlice {
    const validIds = getFigureCatalogIds(catalog)
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        if (validIds.has(placement.figureId)) {
            figuresByCoord[key] = placement
        }
    }

    return {
        figuresByCoord,
        tray: figures.tray.filter(placement => validIds.has(placement.figureId)),
    }
}

export function cloneFiguresSlicePlacements(figures: FiguresSlice): FiguresSlice {
    const figuresByCoord: Record<string, FigurePlacement> = {}

    for (const [key, placement] of Object.entries(figures.figuresByCoord)) {
        figuresByCoord[key] = cloneFigurePlacement(placement)
    }

    return {
        figuresByCoord,
        tray: figures.tray.map(cloneFigurePlacement),
    }
}

function scrubActionReferences(action: GameAction, removedFigureId: FigureId): GameAction | null {
    if (action.type !== GameActionType.spawnFigure) {
        return action
    }

    const params = action.params as SpawnFigureActionParams

    if (params.figureId === removedFigureId) {
        return null
    }

    return action
}

function scrubEventRuleReferences(rule: FigureEventRule, removedFigureId: FigureId): FigureEventRule {
    let params: FigureEventRule['params'] = rule.params

    if (rule.type === FigureEventType.steppedOnBy) {
        const steppedParams = { ...(params as FigureEventParamsSteppedOnBy | undefined) }

        if (steppedParams.stepperFigures?.length) {
            steppedParams.stepperFigures = canonicalizeFigureFilterArray(
                steppedParams.stepperFigures.filter(entry => (
                    !isConcreteFigureFilter(entry.figureId)
                    || entry.figureId !== removedFigureId
                )),
            )
        } else if (steppedParams.stepperFigureId === removedFigureId) {
            steppedParams.stepperFigureId = FIGURE_FILTER_NONE
            delete steppedParams.stepperStateIndex
        }

        params = steppedParams
    } else if (rule.type === FigureEventType.stepOnFigure) {
        const stepOnParams = { ...(params as FigureEventParamsStepOnFigure | undefined) }

        if (stepOnParams.targetFigures?.length) {
            stepOnParams.targetFigures = canonicalizeFigureFilterArray(
                stepOnParams.targetFigures.filter(entry => (
                    !isConcreteFigureFilter(entry.figureId)
                    || entry.figureId !== removedFigureId
                )),
            )
        } else if (stepOnParams.targetFigureId === removedFigureId) {
            stepOnParams.targetFigureId = FIGURE_FILTER_NONE
            delete stepOnParams.targetStateIndex
        }

        params = stepOnParams
    } else if (rule.type === FigureEventType.enterFigureArea) {
        const areaParams = { ...(params as FigureEventParamsEnterFigureArea | undefined) }

        if (areaParams.anchorFigures?.length) {
            areaParams.anchorFigures = canonicalizeFigureFilterArray(
                areaParams.anchorFigures.filter(entry => (
                    !isConcreteFigureFilter(entry.figureId)
                    || entry.figureId !== removedFigureId
                )),
            )
        } else if (areaParams.figureId === removedFigureId) {
            delete areaParams.figureId
            delete areaParams.halfWidth
            delete areaParams.halfHeight
        }

        params = areaParams as FigureEventRule['params']
    } else if (rule.type === FigureEventType.areaEnteredBy) {
        const areaParams = { ...(params as FigureEventParamsAreaEnteredBy | undefined) }

        if (areaParams.entererFigures?.length) {
            areaParams.entererFigures = canonicalizeFigureFilterArray(
                areaParams.entererFigures.filter(entry => (
                    !isConcreteFigureFilter(entry.figureId)
                    || entry.figureId !== removedFigureId
                )),
            )
        }

        params = areaParams as FigureEventRule['params']
    }

    const actions = (rule.actions ?? [])
        .map(action => scrubActionReferences(action, removedFigureId))
        .filter((action): action is GameAction => action !== null)

    return {
        ...rule,
        params,
        actions,
    }
}

export function removeFigureReferencesFromCatalog(
    catalog: FigureCatalog,
    removedFigureId: FigureId,
): FigureCatalog {
    return catalog.map(entry => {
        if (!entry.eventRules?.length) {
            return entry
        }

        const eventRules = entry.eventRules
            .map(rule => scrubEventRuleReferences(rule, removedFigureId))
            .map(rule => normalizeFigureEventRule(rule))
            .filter((rule): rule is FigureEventRule => rule !== null)

        return {
            ...entry,
            eventRules,
        }
    })
}
