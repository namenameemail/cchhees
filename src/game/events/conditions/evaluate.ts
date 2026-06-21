import { CellCoord, coordKey } from '../../types/coords'
import {
    FigureEventAreaCell,
    FigureEventCondition,
    FigureEventConditionMatchMode,
    FigureEventConditionParamsFigureList,
    FigureEventConditionParamsInFigureArea,
    FigureEventConditionParamsLandedInFigureArea,
    FigureEventConditionParamsLandedOnCell,
    FigureEventConditionParamsLandedOnFigure,
    FigureEventConditionParamsLeftCell,
    FigureEventConditionParamsMovedBy,
    FigureEventConditionParamsOnCells,
    FigureEventConditionParamsSteppedOnByFigure,
    FigureEventConditionType,
    FigureEventParamsOnMove,
    FigureEventParamsSteppedOnBy,
    FigureEventRule,
    FigureEventType,
    StepCause,
} from '../../types/events'
import { FigureId, FigurePlacement } from '../../types/figures'
import {
    normalizeFigureEventParamsEnterFigureArea,
    resolvePlacementStateIndex,
} from '../../figureView'
import { matchesFigureFilterList } from '../../figureFilter'
import {
    getStackPlacementsByFilter,
    getTopOfStack,
    iterBoardPlacements,
    matchesStackPosition,
} from '../../figureStack'
import {
    BoardStacks,
    allCoordsMatchList,
    coordMatchesList,
    isInsideFigureArea,
    isInsideRect,
    isNewlyInArea,
    isSameCell,
    normalizeBoardStacks,
    resolvePlacementCoordBefore,
} from '../geometry'
import { MoveEventContext, TriggeredFigureEvent } from '../types'
import { SteppedOnEvent } from '../steppedOnQueue'
import { resolveSubjectInstances, subjectHasBoardScanEntries, isOnlyMovedSubject, SubjectResolutionContext } from './resolveSubject'

export interface ConditionMatchContext {
    areaAnchor?: TriggeredFigureEvent['areaAnchor']
    subjectCoord?: TriggeredFigureEvent['subjectCoord']
    subjectPlacement?: TriggeredFigureEvent['subjectPlacement']
    stepOnTarget?: TriggeredFigureEvent['stepOnTarget']
    triggerMode?: TriggeredFigureEvent['triggerMode']
    includePassive?: TriggeredFigureEvent['includePassive']
    triggerConditionType?: FigureEventConditionType
}

export interface ConditionEvalContext extends SubjectResolutionContext {
    ownerFigureId?: FigureId
    hoppedFigures?: FigurePlacement[]
}

function matchesStepCause(cause: StepCause | undefined, stepCause: StepCause | undefined): boolean {
    const resolvedCause = cause ?? 'any'
    const resolvedStepCause = stepCause ?? 'manual'

    return resolvedCause === 'any' || resolvedCause === resolvedStepCause
}

function resolveMatchMode(mode?: FigureEventConditionMatchMode): FigureEventConditionMatchMode {
    return mode ?? 'any'
}

function mergeContext(
    base: ConditionMatchContext,
    patch: ConditionMatchContext,
): ConditionMatchContext {
    return { ...base, ...patch }
}

function collectFigureAreaAnchors(
    params: FigureEventConditionParamsInFigureArea | FigureEventConditionParamsLandedInFigureArea,
    figuresByCoord: BoardStacks,
) {
    const normalized = normalizeFigureEventParamsEnterFigureArea(params)
    const anchors: Array<{ coord: CellCoord; placement: FigurePlacement }> = []

    for (const { coord, placement } of iterBoardPlacements(figuresByCoord)) {
        if (!matchesFigureFilterList(
            normalized.anchorFigures,
            placement.figureId,
            resolvePlacementStateIndex(placement),
        )) {
            continue
        }

        anchors.push({ coord, placement })
    }

    return { normalized, anchors }
}

function evaluateQuantified(
    results: boolean[],
    matchMode: FigureEventConditionMatchMode,
): boolean {
    if (results.length === 0) {
        return false
    }

    return matchMode === 'all'
        ? results.every(Boolean)
        : results.some(Boolean)
}

function resolveSubjectMatchMode(
    subject: FigureEventCondition['subject'],
): FigureEventConditionMatchMode {
    return resolveMatchMode(subject.matchMode)
}

function evaluateSingleCondition(
    condition: FigureEventCondition,
    ctx: ConditionEvalContext,
    base: ConditionMatchContext,
): ConditionMatchContext[] {
    const instances = resolveSubjectInstances(condition.subject, ctx)
    const subjectMatchMode = resolveSubjectMatchMode(condition.subject)

    if (instances.length === 0 && !subjectHasBoardScanEntries(condition.subject.entries)) {
        return []
    }

    switch (condition.type) {
        case FigureEventConditionType.inBoardArea: {
            const params = condition.params as { x1: number; y1: number; x2: number; y2: number } | undefined
            if (!params) {
                return []
            }

            const results = instances.map(item => isInsideRect(item.coord, params))
            return evaluateQuantified(results, subjectMatchMode) ? [base] : []
        }
        case FigureEventConditionType.inFigureArea: {
            const params = condition.params as FigureEventConditionParamsInFigureArea | undefined
            const cells = params?.cells ?? []
            if (!cells.length) {
                return []
            }

            const { anchors } = collectFigureAreaAnchors(params ?? {}, ctx.figuresByCoord)
            const results = instances.map(item => (
                anchors.some(anchor => isInsideFigureArea(item.coord, anchor.coord, cells))
            ))
            return evaluateQuantified(results, subjectMatchMode) ? [base] : []
        }
        case FigureEventConditionType.onCells: {
            const params = condition.params as FigureEventConditionParamsOnCells | undefined
            const cells = params?.cells ?? []
            if (!cells.length) {
                return []
            }

            const cellMode = resolveMatchMode(params?.matchMode)
            const results = instances.map(item => (
                cellMode === 'all'
                    ? allCoordsMatchList(item.coord, cells)
                    : coordMatchesList(item.coord, cells)
            ))
            return evaluateQuantified(results, subjectMatchMode) ? [base] : []
        }
        case FigureEventConditionType.aboveFigures:
        case FigureEventConditionType.belowFigures: {
            const params = condition.params as FigureEventConditionParamsFigureList | undefined
            const figures = params?.figures
            const results = instances.map(item => {
                const stack = ctx.figuresByCoord[coordKey(item.coord)] ?? []
                const index = stack.findIndex(entry => entry.instanceId === item.placement.instanceId)
                if (index < 0) {
                    return false
                }

                const compareIndex = condition.type === FigureEventConditionType.aboveFigures
                    ? index + 1
                    : index - 1

                if (compareIndex < 0 || compareIndex >= stack.length) {
                    return false
                }

                const other = stack[compareIndex]
                return matchesFigureFilterList(
                    figures,
                    other.figureId,
                    resolvePlacementStateIndex(other),
                )
            })
            return evaluateQuantified(results, subjectMatchMode) ? [base] : []
        }
        case FigureEventConditionType.leftCell: {
            const params = condition.params as FigureEventConditionParamsLeftCell | undefined
            if (!params) {
                return []
            }

            const results = instances.map(item => (
                item.beforeCoord != null && isSameCell(item.beforeCoord, params.x, params.y)
            ))
            return evaluateQuantified(results, subjectMatchMode)
                ? [mergeContext(base, { triggerConditionType: condition.type })]
                : []
        }
        case FigureEventConditionType.movedBy: {
            const params = condition.params as FigureEventConditionParamsMovedBy | undefined
            if (!params || !ctx.move) {
                return []
            }

            const dx = ctx.move.to.i - ctx.move.from.i
            const dy = ctx.move.to.j - ctx.move.from.j
            const matched = dx === Math.trunc(params.dx) && dy === Math.trunc(params.dy)
            return matched ? [mergeContext(base, { triggerConditionType: condition.type })] : []
        }
        case FigureEventConditionType.landedInBoardArea: {
            const params = condition.params as { x1: number; y1: number; x2: number; y2: number } | undefined
            if (!params) {
                return []
            }

            const results = instances.map(item => isInsideRect(item.coord, params))
            return evaluateQuantified(results, subjectMatchMode)
                ? [mergeContext(base, { triggerConditionType: condition.type })]
                : []
        }
        case FigureEventConditionType.landedOnCell: {
            const params = condition.params as FigureEventConditionParamsLandedOnCell | undefined
            if (!params) {
                return []
            }

            const results = instances.map(item => isSameCell(item.coord, params.x, params.y))
            return evaluateQuantified(results, subjectMatchMode)
                ? [mergeContext(base, { triggerConditionType: condition.type })]
                : []
        }
        case FigureEventConditionType.landedOnFigure: {
            const params = condition.params as FigureEventConditionParamsLandedOnFigure | undefined
            if (!ctx.move) {
                return []
            }

            const moverMatchesSubject = instances.some(
                item => item.placement.instanceId === ctx.move!.actorPlacement.instanceId,
            )
            if (!moverMatchesSubject) {
                return []
            }

            if (ctx.move.targetAtTo) {
                if (!matchesFigureFilterList(
                    params?.figures,
                    ctx.move.targetAtTo.figureId,
                    resolvePlacementStateIndex(ctx.move.targetAtTo),
                )) {
                    return []
                }

                const stack = ctx.figuresByCoord[coordKey(ctx.move.to)] ?? []
                const targetIndex = stack.findIndex(item => item.instanceId === ctx.move!.targetAtTo!.instanceId)

                if (targetIndex >= 0 && params?.stackTarget && params.stackTarget !== 'all') {
                    if (!matchesStackPosition(stack.length, targetIndex, params.stackTarget, params.stackIndex)) {
                        return []
                    }
                }

                return [mergeContext(base, {
                    stepOnTarget: ctx.move.targetAtTo,
                    triggerConditionType: condition.type,
                })]
            }

            const stack = ctx.figuresByCoord[coordKey(ctx.move.to)] ?? []
            const targets = getStackPlacementsByFilter(
                stack,
                params?.stackTarget ?? 'all',
                params?.stackIndex ?? 0,
                placement => matchesFigureFilterList(
                    params?.figures,
                    placement.figureId,
                    resolvePlacementStateIndex(placement),
                ),
            ).filter(item => item.instanceId !== ctx.move!.actorPlacement.instanceId)

            if (targets.length === 0) {
                return []
            }

            const mode = resolveMatchMode(params?.matchMode)
            if (mode === 'all') {
                return [mergeContext(base, {
                    stepOnTarget: targets[0],
                    triggerConditionType: condition.type,
                })]
            }

            return targets.map(stepOnTarget => mergeContext(base, {
                stepOnTarget,
                triggerConditionType: condition.type,
            }))
        }
        case FigureEventConditionType.landedInFigureArea: {
            const params = condition.params as FigureEventConditionParamsLandedInFigureArea | undefined
            const cells = params?.cells ?? []
            if (!cells.length || !ctx.move) {
                return []
            }

            const { anchors } = collectFigureAreaAnchors(params ?? {}, ctx.figuresByCoord)
            const beforeBoard = ctx.beforeBoard
            const triggered: ConditionMatchContext[] = []

            for (const { coord: anchorAfter, placement: anchorPlacement } of anchors) {
                const anchorBefore = resolvePlacementCoordBefore(anchorPlacement, beforeBoard)

                for (const item of instances) {
                    if (!isNewlyInArea(
                        item.coord,
                        item.beforeCoord ?? item.coord,
                        anchorAfter,
                        anchorBefore,
                        cells,
                    )) {
                        continue
                    }

                    const triggerMode = item.placement.instanceId === ctx.move.actorPlacement.instanceId
                        ? 'active'
                        : 'passive'

                    if (triggerMode === 'passive' && params?.includePassive === false) {
                        continue
                    }

                    triggered.push(mergeContext(base, {
                        areaAnchor: anchorAfter,
                        subjectCoord: item.coord,
                        subjectPlacement: item.placement,
                        triggerMode,
                        includePassive: params?.includePassive,
                        triggerConditionType: condition.type,
                    }))
                }
            }

            return triggered
        }
        case FigureEventConditionType.figureEnteredArea: {
            const params = condition.params as FigureEventConditionParamsLandedInFigureArea | undefined
            const cells = params?.cells ?? []
            if (!cells.length || !ctx.move) {
                return []
            }

            const beforeBoard = ctx.beforeBoard
            const triggered: ConditionMatchContext[] = []
            const { anchors } = collectFigureAreaAnchors(params ?? {}, ctx.figuresByCoord)

            for (const { coord: ownerAfter, placement: ownerPlacement } of anchors) {
                const ownerBefore = resolvePlacementCoordBefore(ownerPlacement, beforeBoard)

                for (const item of instances) {
                    if (!isNewlyInArea(
                        item.coord,
                        item.beforeCoord ?? item.coord,
                        ownerAfter,
                        ownerBefore,
                        cells,
                    )) {
                        continue
                    }

                    const triggerMode = item.placement.instanceId === ctx.move.actorPlacement.instanceId
                        ? 'active'
                        : 'passive'

                    if (triggerMode === 'passive' && params?.includePassive === false) {
                        continue
                    }

                    triggered.push(mergeContext(base, {
                        areaAnchor: ownerAfter,
                        subjectCoord: item.coord,
                        subjectPlacement: item.placement,
                        triggerMode,
                        includePassive: params?.includePassive,
                        triggerConditionType: condition.type,
                    }))
                }
            }

            return triggered
        }
        case FigureEventConditionType.steppedOnByFigure: {
            const params = condition.params as FigureEventConditionParamsSteppedOnByFigure | undefined
            const stepper = ctx.move?.stepperPlacement ?? ctx.steppedOn?.stepperPlacement

            if (!stepper) {
                return []
            }

            const matched = matchesFigureFilterList(
                params?.stepperFigures,
                stepper.figureId,
                resolvePlacementStateIndex(stepper),
            )

            return matched
                ? [mergeContext(base, { triggerConditionType: condition.type })]
                : []
        }
        case FigureEventConditionType.isFigure:
        case FigureEventConditionType.isNotFigure: {
            const params = condition.params as FigureEventConditionParamsFigureList | undefined
            const results = instances.map(item => matchesFigureFilterList(
                params?.figures,
                item.placement.figureId,
                resolvePlacementStateIndex(item.placement),
            ))
            const matched = condition.type === FigureEventConditionType.isFigure
                ? evaluateQuantified(results, subjectMatchMode)
                : !evaluateQuantified(results, subjectMatchMode)

            return matched
                ? [mergeContext(base, { triggerConditionType: condition.type })]
                : []
        }
        case FigureEventConditionType.exitedBoard:
            return [mergeContext(base, { triggerConditionType: condition.type })]
        case FigureEventConditionType.hoppedOverFigures: {
            const params = condition.params as FigureEventConditionParamsFigureList | undefined
            const hopped = ctx.hoppedFigures ?? []
            const mode = resolveMatchMode(params?.matchMode)
            const results = hopped.map(placement => matchesFigureFilterList(
                params?.figures,
                placement.figureId,
                resolvePlacementStateIndex(placement),
            ))

            return evaluateQuantified(results, mode)
                ? [mergeContext(base, { triggerConditionType: condition.type })]
                : []
        }
        default:
            return []
    }
}

export function evaluateAllConditions(
    conditions: FigureEventCondition[],
    ctx: ConditionEvalContext,
): ConditionMatchContext[] {
    if (conditions.length === 0) {
        return [{}]
    }

    let contexts: ConditionMatchContext[] = [{}]

    for (const condition of conditions) {
        const next: ConditionMatchContext[] = []

        for (const base of contexts) {
            next.push(...evaluateSingleCondition(condition, ctx, base))
        }

        if (next.length === 0) {
            return []
        }

        contexts = next
    }

    return contexts
}

export function evaluateOnMoveRule(
    rule: FigureEventRule,
    moveCtx: MoveEventContext,
    figuresByCoord: BoardStacks,
): ConditionMatchContext[] {
    if (rule.type !== FigureEventType.onMove) {
        return []
    }

    const eventParams = (rule.params ?? {}) as FigureEventParamsOnMove
    if (!matchesStepCause(eventParams.cause, moveCtx.stepCause)) {
        return []
    }

    const beforeBoard = normalizeBoardStacks(moveCtx.figuresBeforeMove)
    const evalCtx: ConditionEvalContext = {
        move: moveCtx,
        figuresByCoord,
        beforeBoard,
        hoppedFigures: moveCtx.hoppedFigures,
    }

    const conditions = rule.conditions ?? []

    if (conditions.length === 0) {
        return [{}]
    }

    return evaluateAllConditions(conditions, evalCtx)
}

export function evaluateSteppedOnRule(
    rule: FigureEventRule,
    event: SteppedOnEvent,
    figures: BoardStacks,
): boolean {
    if (rule.type !== FigureEventType.steppedOnBy) {
        return false
    }

    const eventParams = (rule.params ?? {}) as FigureEventParamsSteppedOnBy
    if (!matchesStepCause(eventParams.cause, event.cause)) {
        return false
    }

    if (eventParams.stackPosition && eventParams.stackPosition !== 'any') {
        const stack = figures[coordKey(event.targetCoord)] ?? []
        const targetIndex = stack.findIndex(item => item.instanceId === event.targetPlacement.instanceId)

        if (targetIndex < 0 || !matchesStackPosition(
            stack.length,
            targetIndex,
            eventParams.stackPosition,
            eventParams.stackIndex,
        )) {
            return false
        }
    }

    const evalCtx: ConditionEvalContext = {
        steppedOn: event,
        figuresByCoord: figures,
        move: {
            from: event.stepperCoord,
            to: event.targetCoord,
            actorPlacement: event.stepperPlacement,
            targetAtTo: event.targetPlacement,
            stepperPlacement: event.stepperPlacement,
            stepCause: event.cause,
        } as MoveEventContext,
    }

    const conditions = rule.conditions ?? []
    if (conditions.length === 0) {
        return true
    }

    return evaluateAllConditions(conditions, evalCtx).length > 0
}

export function evaluateLeaveBoardRule(
    rule: FigureEventRule,
    placement: FigurePlacement,
): boolean {
    if (rule.type !== FigureEventType.leaveBoard) {
        return false
    }

    const conditions = rule.conditions ?? []
    return conditions.length === 0
        || conditions.every(condition => condition.type === FigureEventConditionType.exitedBoard)
}
