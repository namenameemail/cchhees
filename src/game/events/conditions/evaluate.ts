import { CellCoord, coordKey } from '../../types/coords'
import {
    FigureEventCondition,
    FigureEventConditionMatchMode,
    FigureEventConditionParamsFigureList,
    FigureEventConditionParamsHasFigureInArea,
    FigureEventConditionParamsInBoardArea,
    FigureEventConditionParamsInFigureArea,
    FigureEventConditionParamsMovedBy,
    FigureEventConditionType,
    FigureEventParamsOnMove,
    FigureEventParamsSteppedOnBy,
    FigureEventRule,
    FigureEventType,
    StepCause,
} from '../../types/events'
import { FigureId, FigurePlacement, FigureTeams } from '../../types/figures'
import {
    normalizeFigureEventParamsEnterFigureArea,
    resolvePlacementStateIndex,
} from '../../figureView'
import { canonicalizeFigureFilterArray, matchesFigureFilterList } from '../../figureFilter'
import { iterBoardPlacements, matchesStackPosition } from '../../figureStack'
import {
    BoardStacks,
    evaluateByMovePhase,
    isInsideFigureArea,
    normalizeBoardStacks,
    resolvePlacementCoordBefore,
} from '../geometry'
import {
    isInsideOrientedRect,
    isOrientToTeamDirection,
    maybeOrientAreaCells,
    maybeOrientDelta,
    resolveOrientFigureId,
} from '../coordinateOrientation'
import { MoveEventContext, TriggeredFigureEvent } from '../types'
import { SteppedOnEvent } from '../steppedOnQueue'
import { resolveSubjectInstances, subjectHasBoardScanEntries, isOnlyMovedSubject, SubjectInstance, SubjectResolutionContext } from './resolveSubject'

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
    figureTeams?: FigureTeams
}

function resolveOrientCatalog(ctx: ConditionEvalContext) {
    return ctx.move?.catalog ?? []
}

function resolveOrientBoardParameters(ctx: ConditionEvalContext) {
    return ctx.move?.boardParameters
}

function resolveOrientFigureIdForInstance(
    ctx: ConditionEvalContext,
    item: SubjectInstance,
    anchorPlacement?: FigurePlacement,
): FigureId | undefined {
    return resolveOrientFigureId(
        ctx.ownerFigureId ?? ctx.move?.ownerFigureId ?? ctx.move?.actorPlacement.figureId,
        anchorPlacement ?? item.placement,
    )
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
    params: FigureEventConditionParamsInFigureArea,
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

function subjectIncludesPlacement(
    instances: SubjectInstance[],
    placement: FigurePlacement,
): boolean {
    return instances.some(item => item.placement.instanceId === placement.instanceId)
}

function resolveSubjectMatchMode(
    subject: FigureEventCondition['subject'],
): FigureEventConditionMatchMode {
    return resolveMatchMode(subject.matchMode)
}

function resolveMovedActorAfterCoord(item: SubjectInstance, ctx: ConditionEvalContext): CellCoord {
    if (ctx.move && item.placement.instanceId === ctx.move.actorPlacement.instanceId) {
        return ctx.move.to
    }

    return item.coord
}

function resolveMovedActorBeforeCoord(item: SubjectInstance, ctx: ConditionEvalContext): CellCoord {
    if (ctx.move && item.placement.instanceId === ctx.move.actorPlacement.instanceId) {
        return ctx.move.from
    }

    return item.beforeCoord ?? item.coord
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
            const params = condition.params as FigureEventConditionParamsInBoardArea | undefined
            if (!params) {
                return []
            }

            const orient = isOrientToTeamDirection(params)
            const catalog = resolveOrientCatalog(ctx)
            const boardParameters = resolveOrientBoardParameters(ctx)
            const results = instances.map(item => {
                const after = resolveMovedActorAfterCoord(item, ctx)
                const before = resolveMovedActorBeforeCoord(item, ctx)
                const figureId = resolveOrientFigureIdForInstance(ctx, item)

                return evaluateByMovePhase(params.movePhase, which => isInsideOrientedRect(
                    which === 'after' ? after : before,
                    params,
                    orient,
                    catalog,
                    figureId,
                    boardParameters,
                    ctx.figureTeams,
                ))
            })
            return evaluateQuantified(results, subjectMatchMode) ? [base] : []
        }
        case FigureEventConditionType.inFigureArea: {
            const params = condition.params as FigureEventConditionParamsInFigureArea | undefined
            const cells = params?.cells ?? []
            if (!cells.length) {
                return []
            }

            const orient = isOrientToTeamDirection(params)
            const catalog = resolveOrientCatalog(ctx)
            const boardParameters = resolveOrientBoardParameters(ctx)
            const phase = params?.movePhase ?? 'after'
            const { anchors } = collectFigureAreaAnchors(params ?? {}, ctx.figuresByCoord)

            if (phase === 'before' || phase === 'after') {
                const results = instances.map(item => {
                    const coord = phase === 'after'
                        ? resolveMovedActorAfterCoord(item, ctx)
                        : resolveMovedActorBeforeCoord(item, ctx)

                    return anchors.some(anchor => {
                        const anchorCoord = phase === 'after'
                            ? anchor.coord
                            : (resolvePlacementCoordBefore(anchor.placement, ctx.beforeBoard) ?? anchor.coord)
                        const orientedCells = maybeOrientAreaCells(
                            cells,
                            orient,
                            catalog,
                            anchor.placement.figureId,
                            boardParameters,
                            ctx.figureTeams,
                        )
                        return isInsideFigureArea(coord, anchorCoord, orientedCells)
                    })
                })
                return evaluateQuantified(results, subjectMatchMode) ? [base] : []
            }

            if (!ctx.move) {
                return []
            }

            const triggered: ConditionMatchContext[] = []

            for (const { coord: anchorAfter, placement: anchorPlacement } of anchors) {
                const anchorBefore = resolvePlacementCoordBefore(anchorPlacement, ctx.beforeBoard)
                const orientedCells = maybeOrientAreaCells(
                    cells,
                    orient,
                    catalog,
                    anchorPlacement.figureId,
                    boardParameters,
                    ctx.figureTeams,
                )

                for (const item of instances) {
                    const subjectAfter = resolveMovedActorAfterCoord(item, ctx)
                    const subjectBefore = resolveMovedActorBeforeCoord(item, ctx)

                    const matched = evaluateByMovePhase(phase, which => isInsideFigureArea(
                        which === 'after' ? subjectAfter : subjectBefore,
                        which === 'after' ? anchorAfter : (anchorBefore ?? anchorAfter),
                        orientedCells,
                    ))

                    if (!matched) {
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
                        subjectCoord: phase === 'entered' ? subjectAfter : subjectBefore,
                        subjectPlacement: item.placement,
                        triggerMode,
                        includePassive: params?.includePassive,
                        triggerConditionType: condition.type,
                    }))
                }
            }

            return triggered
        }
        case FigureEventConditionType.movedBy: {
            const params = condition.params as FigureEventConditionParamsMovedBy | undefined
            if (!params || !ctx.move) {
                return []
            }

            if (!subjectIncludesPlacement(instances, ctx.move.actorPlacement)) {
                return []
            }

            const dx = ctx.move.to.i - ctx.move.from.i
            const dy = ctx.move.to.j - ctx.move.from.j
            const orient = isOrientToTeamDirection(params)
            const figureId = ctx.move.actorPlacement.figureId
            const expected = maybeOrientDelta(
                params.dx,
                params.dy,
                orient,
                resolveOrientCatalog(ctx),
                figureId,
                resolveOrientBoardParameters(ctx),
                ctx.figureTeams,
            )
            const matched = dx === expected.dx && dy === expected.dy
            return matched ? [mergeContext(base, { triggerConditionType: condition.type })] : []
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

            if (!ctx.move || !subjectIncludesPlacement(instances, ctx.move.actorPlacement)) {
                return []
            }

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
        case FigureEventConditionType.hasFigureInArea: {
            const params = condition.params as FigureEventConditionParamsHasFigureInArea | undefined
            const rawCells = params?.cells ?? []
            if (!rawCells.length) {
                return []
            }

            const orient = isOrientToTeamDirection(params)
            const catalog = resolveOrientCatalog(ctx)
            const boardParameters = resolveOrientBoardParameters(ctx)
            const figureMode = resolveMatchMode(params?.matchMode)
            const filters = canonicalizeFigureFilterArray(params?.figures)

            const computeHasFigure = (item: SubjectInstance, coord: CellCoord, board: BoardStacks): boolean => {
                const figureId = resolveOrientFigureIdForInstance(ctx, item)
                const cells = maybeOrientAreaCells(
                    rawCells,
                    orient,
                    catalog,
                    figureId,
                    boardParameters,
                    ctx.figureTeams,
                )
                const areaPlacements: FigurePlacement[] = []

                for (const cell of cells) {
                    const targetCoord: CellCoord = {
                        i: coord.i + cell.x,
                        j: coord.j + cell.y,
                    }
                    const stack = board[coordKey(targetCoord)] ?? []

                    for (const placement of stack) {
                        if (placement.instanceId === item.placement.instanceId) {
                            continue
                        }

                        areaPlacements.push(placement)
                    }
                }

                if (figureMode === 'all') {
                    if (!filters.length) {
                        return false
                    }

                    return filters.every(filter => areaPlacements.some(placement => (
                        matchesFigureFilterList(
                            [filter],
                            placement.figureId,
                            resolvePlacementStateIndex(placement),
                        )
                    )))
                }

                return areaPlacements.some(placement => matchesFigureFilterList(
                    params?.figures,
                    placement.figureId,
                    resolvePlacementStateIndex(placement),
                ))
            }

            const results = instances.map(item => {
                const after = resolveMovedActorAfterCoord(item, ctx)
                const before = resolveMovedActorBeforeCoord(item, ctx)

                return evaluateByMovePhase(params?.movePhase, which => computeHasFigure(
                    item,
                    which === 'after' ? after : before,
                    which === 'after' ? ctx.figuresByCoord : (ctx.beforeBoard ?? ctx.figuresByCoord),
                ))
            })

            return evaluateQuantified(results, subjectMatchMode)
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
        ownerFigureId: moveCtx.ownerFigureId,
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
