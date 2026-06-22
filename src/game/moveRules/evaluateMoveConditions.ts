import { BoardParameters } from '../types/boardParameters'
import { CellCoord, coordKey } from '../types/coords'
import { FigureCatalog, FigureId, FigurePlacement } from '../types/figures'
import { FigureEventCondition } from '../types/events'
import { FiguresSlice } from '../state/slices'
import { evaluateAllConditions } from '../events/conditions/evaluate'
import { MoveEventContext } from '../events/types'

export interface MoveVariantConditionContext {
    from: CellCoord
    to: CellCoord
    actorPlacement: FigurePlacement
    catalog: FigureCatalog
    figuresByCoord: FiguresSlice['figuresByCoord']
    boardParameters: BoardParameters
    ownerFigureId?: FigureId
    hoppedFigures?: FigurePlacement[]
}

export function evaluateMoveVariantConditions(
    conditions: FigureEventCondition[] | undefined,
    ctx: MoveVariantConditionContext,
): boolean {
    if (!conditions?.length) {
        return true
    }

    const targetAtTo = ctx.figuresByCoord[coordKey(ctx.to)]?.at(-1)

    const moveCtx: MoveEventContext = {
        from: ctx.from,
        to: ctx.to,
        actorPlacement: ctx.actorPlacement,
        targetAtTo: targetAtTo && targetAtTo.instanceId !== ctx.actorPlacement.instanceId
            ? targetAtTo
            : undefined,
        boardParameters: ctx.boardParameters,
        catalog: ctx.catalog,
        eventRules: [],
        ownerFigureId: ctx.ownerFigureId ?? ctx.actorPlacement.figureId,
        hoppedFigures: ctx.hoppedFigures,
        figuresBeforeMove: ctx.figuresByCoord,
        stepCause: 'manual',
    }

    return evaluateAllConditions(conditions, {
        move: moveCtx,
        figuresByCoord: ctx.figuresByCoord,
        beforeBoard: ctx.figuresByCoord,
        hoppedFigures: ctx.hoppedFigures,
        ownerFigureId: moveCtx.ownerFigureId,
    }).length > 0
}
