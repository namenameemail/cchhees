import { CellCoord, coordKey, coordsEqual } from '../../types/coords'
import {
    FigureEventAreaCell,
    FigureEventConditionSubject,
    FigureEventSubjectNearby,
    FigureEventType,
    GameAction,
    GameActionTarget,
    GameActionType,
    SetOtherStateActionParams,
} from '../../types/events'
import { FigureId } from '../../types/figures'
import {
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
    isConcreteFigureFilter,
} from '../../figureFilter'
import { LeaveBoardActionContext, SteppedOnEvent } from '../steppedOnQueue'
import { MoveEventContext } from '../types'
import {
    resolveSubjectInstances,
    SubjectInstance,
    SubjectResolutionContext,
} from '../conditions/resolveSubject'
import {
    isOrientToTeamDirection,
    maybeOrientAreaCells,
} from '../coordinateOrientation'
import { FigureTeams } from '../../types/figures'

export interface ActionSubjectContext extends SubjectResolutionContext {
    ownerFigureId?: FigureId
    eventType?: FigureEventType
    figureTeams?: FigureTeams
}

export function isSubjectNearbyEnabled(
    subject: FigureEventConditionSubject | undefined,
): boolean {
    return subject?.nearby?.enabled === true
        && (subject.nearby.cells?.length ?? 0) > 0
}

function resolveNearbyFromAnchors(
    anchors: SubjectInstance[],
    cells: FigureEventAreaCell[],
    figuresByCoord: SubjectResolutionContext['figuresByCoord'],
    ctx: ActionSubjectContext,
    nearby?: FigureEventSubjectNearby,
): SubjectInstance[] {
    const seen = new Set<string>()
    const instances: SubjectInstance[] = []
    const orient = isOrientToTeamDirection(nearby)
    const catalog = ctx.move?.catalog ?? []
    const boardParameters = ctx.move?.boardParameters

    for (const anchor of anchors) {
        const orientedCells = maybeOrientAreaCells(
            cells,
            orient,
            catalog,
            anchor.placement.figureId,
            boardParameters,
            ctx.figureTeams,
        )

        for (const cell of orientedCells) {
            const targetCoord: CellCoord = {
                i: anchor.coord.i + cell.x,
                j: anchor.coord.j + cell.y,
            }
            const stack = figuresByCoord[coordKey(targetCoord)] ?? []

            for (const placement of stack) {
                if (placement.instanceId === anchor.placement.instanceId) {
                    continue
                }

                if (seen.has(placement.instanceId)) {
                    continue
                }

                seen.add(placement.instanceId)
                instances.push({
                    placement,
                    coord: targetCoord,
                    beforeCoord: targetCoord,
                })
            }
        }
    }

    return instances
}

function defaultSubjectEntries(eventType?: FigureEventType): FigureEventConditionSubject['entries'] {
    if (eventType === FigureEventType.steppedOnBy) {
        return [{ figureId: FIGURE_SUBJECT_STEPPED_ON }]
    }

    return [{ figureId: FIGURE_SUBJECT_MOVED }]
}

function migrateLegacySetOtherStateTarget(
    target: GameActionTarget | undefined,
    ownerFigureId?: FigureId,
): FigureEventConditionSubject['entries'] {
    switch (target) {
        case 'steppedBy':
            return [{ figureId: FIGURE_SUBJECT_MOVED }]
        case 'areaAnchor':
            return ownerFigureId
                ? [{ figureId: ownerFigureId }]
                : [{ figureId: FIGURE_SUBJECT_MOVED }]
        case 'steppedOn':
        default:
            return [{ figureId: FIGURE_SUBJECT_STEPPED_ON }]
    }
}

function withNearbyFromAction(
    subject: FigureEventConditionSubject,
    action: GameAction,
): FigureEventConditionSubject {
    if (!action.subject?.nearby) {
        return subject
    }

    return {
        ...subject,
        nearby: action.subject.nearby,
    }
}

export function resolveActionSubject(
    action: GameAction,
    eventType?: FigureEventType,
    ownerFigureId?: FigureId,
): FigureEventConditionSubject {
    if (action.subject?.entries?.length) {
        return withNearbyFromAction({
            entries: action.subject.entries,
            matchMode: action.subject.matchMode ?? 'any',
        }, action)
    }

    if (action.type === GameActionType.setOtherState) {
        const params = action.params as SetOtherStateActionParams
        return withNearbyFromAction({
            entries: migrateLegacySetOtherStateTarget(params?.target, ownerFigureId),
            matchMode: 'any',
        }, action)
    }

    return withNearbyFromAction({
        entries: defaultSubjectEntries(eventType),
        matchMode: 'any',
    }, action)
}

function satisfiesMatchMode(
    subject: FigureEventConditionSubject,
    ctx: ActionSubjectContext,
): boolean {
    const mode = subject.matchMode ?? 'any'

    if (mode === 'any') {
        return resolveSubjectInstances(subject, ctx).length > 0
    }

    return subject.entries.every(entry => (
        resolveSubjectInstances({ entries: [entry], matchMode: 'any' }, ctx).length > 0
    ))
}

export function buildActionSubjectResolutionContext(
    ctx: MoveEventContext,
    figuresByCoord: SubjectResolutionContext['figuresByCoord'],
    beforeBoard?: SubjectResolutionContext['beforeBoard'],
): ActionSubjectContext {
    return {
        move: ctx,
        figuresByCoord,
        beforeBoard,
        ownerFigureId: ctx.ownerFigureId,
        eventType: ctx.eventType,
    }
}

export function buildSteppedOnActionSubjectContext(
    event: SteppedOnEvent,
    figuresByCoord: SubjectResolutionContext['figuresByCoord'],
    ownerFigureId?: FigureId,
): ActionSubjectContext {
    return {
        steppedOn: event,
        figuresByCoord,
        ownerFigureId,
        eventType: FigureEventType.steppedOnBy,
        move: {
            from: event.stepperCoord,
            to: event.targetCoord,
            actorPlacement: event.stepperPlacement,
            targetAtTo: event.targetPlacement,
            stepperPlacement: event.stepperPlacement,
            stepCause: event.cause,
            ownerFigureId,
            eventType: FigureEventType.steppedOnBy,
        } as MoveEventContext,
    }
}

export function buildLeaveBoardActionSubjectContext(
    ctx: LeaveBoardActionContext,
    figuresByCoord: SubjectResolutionContext['figuresByCoord'],
): ActionSubjectContext {
    return {
        figuresByCoord,
        eventType: FigureEventType.leaveBoard,
        move: {
            from: ctx.fromCoord,
            to: ctx.fromCoord,
            actorPlacement: ctx.placement,
            ownerFigureId: ctx.placement.figureId,
            eventType: FigureEventType.leaveBoard,
        } as MoveEventContext,
    }
}

function filterAreaAnchorOwnerInstances(
    instances: SubjectInstance[],
    ctx: ActionSubjectContext,
    subject: FigureEventConditionSubject,
): SubjectInstance[] {
    const areaAnchor = ctx.move?.areaAnchor

    if (!areaAnchor || !ctx.ownerFigureId) {
        return instances
    }

    const ownerOnly = subject.entries.length === 1
        && isConcreteFigureFilter(subject.entries[0].figureId)
        && subject.entries[0].figureId === ctx.ownerFigureId

    if (!ownerOnly) {
        return instances
    }

    return instances.filter(item => coordsEqual(item.coord, areaAnchor))
}

export function resolveActionSubjects(
    action: GameAction,
    ctx: ActionSubjectContext,
): SubjectInstance[] {
    if (action.type === GameActionType.spawnFigure || action.type === GameActionType.spawnFigureNearby) {
        return []
    }

    const subject = resolveActionSubject(action, ctx.eventType, ctx.ownerFigureId)

    if (!satisfiesMatchMode(subject, ctx)) {
        return []
    }

    if (subject.nearby?.enabled === true) {
        const cells = subject.nearby.cells ?? []

        if (!cells.length) {
            return []
        }

        return resolveNearbyFromAnchors(
            resolveSubjectInstances(subject, ctx),
            cells,
            ctx.figuresByCoord,
            ctx,
            subject.nearby,
        )
    }

    let instances = resolveSubjectInstances(subject, ctx)
    instances = filterAreaAnchorOwnerInstances(instances, ctx, subject)

    return instances
}
