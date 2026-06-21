import { coordsEqual } from '../../types/coords'
import {
    FigureEventConditionSubject,
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

export interface ActionSubjectContext extends SubjectResolutionContext {
    ownerFigureId?: FigureId
    eventType?: FigureEventType
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

export function resolveActionSubject(
    action: GameAction,
    eventType?: FigureEventType,
    ownerFigureId?: FigureId,
): FigureEventConditionSubject {
    if (action.subject?.entries?.length) {
        return {
            entries: action.subject.entries,
            matchMode: action.subject.matchMode ?? 'any',
        }
    }

    if (action.type === GameActionType.setOtherState) {
        const params = action.params as SetOtherStateActionParams
        return {
            entries: migrateLegacySetOtherStateTarget(params?.target, ownerFigureId),
            matchMode: 'any',
        }
    }

    return {
        entries: defaultSubjectEntries(eventType),
        matchMode: 'any',
    }
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
    if (action.type === GameActionType.spawnFigure) {
        return []
    }

    const subject = resolveActionSubject(action, ctx.eventType, ctx.ownerFigureId)

    if (!satisfiesMatchMode(subject, ctx)) {
        return []
    }

    let instances = resolveSubjectInstances(subject, ctx)
    instances = filterAreaAnchorOwnerInstances(instances, ctx, subject)

    return instances
}
