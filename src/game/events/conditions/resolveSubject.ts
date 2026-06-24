import { CellCoord } from '../../types/coords'
import {
    FigureEventConditionSubject,
    FigureEventFigureFilter,
} from '../../types/events'
import { FigurePlacement } from '../../types/figures'
import {
    FIGURE_SUBJECT_HOPPED_OVER,
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
    isConcreteFigureFilter,
    isFigureFilterAny,
    isFigureSubjectRole,
    matchesFigureFilterList,
} from '../../figureFilter'
import { iterBoardPlacements } from '../../figureStack'
import { resolvePlacementStateIndex } from '../../figureView'
import { BoardStacks, resolvePlacementCoordBefore } from '../geometry'
import { MoveEventContext } from '../types'
import { SteppedOnEvent } from '../steppedOnQueue'

export interface SubjectInstance {
    placement: FigurePlacement
    coord: CellCoord
    beforeCoord?: CellCoord
}

export interface SubjectResolutionContext {
    move?: MoveEventContext
    steppedOn?: SteppedOnEvent
    figuresByCoord: BoardStacks
    beforeBoard?: BoardStacks
}

function resolveMovedSubject(ctx: SubjectResolutionContext): SubjectInstance[] {
    const { move, steppedOn } = ctx
    const actor = move?.actorPlacement ?? steppedOn?.stepperPlacement

    if (!actor) {
        return []
    }

    const coord = move?.from ?? steppedOn?.stepperCoord

    if (!coord) {
        return []
    }

    return [{
        placement: actor,
        coord,
        beforeCoord: move?.from ?? steppedOn?.stepperCoord,
    }]
}

function resolveSteppedOnSubject(ctx: SubjectResolutionContext): SubjectInstance[] {
    const { move, steppedOn, beforeBoard } = ctx
    const target = move?.targetAtTo ?? steppedOn?.targetPlacement

    if (!target) {
        return []
    }

    const coord = move?.to ?? steppedOn?.targetCoord

    if (!coord) {
        return []
    }

    return [{
        placement: target,
        coord,
        beforeCoord: resolvePlacementCoordBefore(target, beforeBoard) ?? coord,
    }]
}

function resolveFilteredSubjects(
    filter: FigureEventFigureFilter | undefined,
    figuresByCoord: BoardStacks,
    beforeBoard?: BoardStacks,
): SubjectInstance[] {
    const instances: SubjectInstance[] = []

    for (const { coord, placement } of iterBoardPlacements(figuresByCoord)) {
        if (!matchesFigureFilterList(
            filter ? [filter] : undefined,
            placement.figureId,
            resolvePlacementStateIndex(placement),
        )) {
            continue
        }

        instances.push({
            placement,
            coord,
            beforeCoord: resolvePlacementCoordBefore(placement, beforeBoard),
        })
    }

    return instances
}

function resolveHoppedOverSubject(ctx: SubjectResolutionContext): SubjectInstance[] {
    const hopped = ctx.move?.hoppedFigures ?? []

    if (hopped.length === 0) {
        return []
    }

    const hoppedIds = new Set(hopped.map(placement => placement.instanceId))
    const board = ctx.beforeBoard ?? ctx.figuresByCoord
    const instances: SubjectInstance[] = []

    for (const { coord, placement } of iterBoardPlacements(board)) {
        if (!hoppedIds.has(placement.instanceId)) {
            continue
        }

        instances.push({
            placement,
            coord,
            beforeCoord: coord,
        })
    }

    return instances
}

function resolveEntryInstances(
    entry: FigureEventFigureFilter,
    ctx: SubjectResolutionContext,
): SubjectInstance[] {
    if (entry.figureId === FIGURE_SUBJECT_MOVED) {
        return resolveMovedSubject(ctx)
    }

    if (entry.figureId === FIGURE_SUBJECT_STEPPED_ON) {
        return resolveSteppedOnSubject(ctx)
    }

    if (entry.figureId === FIGURE_SUBJECT_HOPPED_OVER) {
        return resolveHoppedOverSubject(ctx)
    }

    if (isFigureFilterAny(entry.figureId)) {
        return resolveFilteredSubjects({ figureId: entry.figureId }, ctx.figuresByCoord, ctx.beforeBoard)
    }

    if (isConcreteFigureFilter(entry.figureId)) {
        return resolveFilteredSubjects(entry, ctx.figuresByCoord, ctx.beforeBoard)
    }

    return []
}

export function subjectHasBoardScanEntries(entries: FigureEventFigureFilter[]): boolean {
    return entries.some(entry => (
        isFigureFilterAny(entry.figureId)
        || isConcreteFigureFilter(entry.figureId)
    ))
}

export function resolveSubjectInstances(
    subject: FigureEventConditionSubject,
    ctx: SubjectResolutionContext,
): SubjectInstance[] {
    const entries = subject.entries ?? []
    const seen = new Set<string>()
    const instances: SubjectInstance[] = []

    for (const entry of entries) {
        for (const instance of resolveEntryInstances(entry, ctx)) {
            if (seen.has(instance.placement.instanceId)) {
                continue
            }

            seen.add(instance.placement.instanceId)
            instances.push(instance)
        }
    }

    return instances
}

export function isOnlyMovedSubject(subject: FigureEventConditionSubject): boolean {
    return subject.entries.length === 1 && subject.entries[0].figureId === FIGURE_SUBJECT_MOVED
}
