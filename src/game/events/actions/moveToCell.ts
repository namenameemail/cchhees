import { CellCoord, isCoordInGrid } from '../../types/coords'
import {
    GameActionType,
    MoveToCellActionParams,
} from '../../types/events'
import { FiguresSlice } from '../../state/slices'
import { cloneFigurePlacement } from '../../figureView'
import { FigurePlacement } from '../../types/figures'
import {
    getTopOfStack,
    isStackOccupied,
    pushToStack,
    removePlacementFromBoard,
    resolvePlacementSnapshot,
} from '../../figureStack'
import { SteppedOnQueueItem } from '../steppedOnQueue'
import { MoveEventContext } from '../types'
import { gameMovesDebugLog } from '../../gameMovesDebugLog'
import { logFigureActionApply, logFigureDisplaceDebug } from '../../figureActionsDebugLog'
import { movePlacementToCoord } from './displaceFigure'

function coordsEqual(a: CellCoord, b: CellCoord): boolean {
    return a.i === b.i && a.j === b.j
}

function enqueueSteppedOnForOccupiedLanding(
    figures: FiguresSlice,
    displaced: FigurePlacement,
    fromCoord: CellCoord,
    landing: CellCoord,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const topOccupant = getTopOfStack(figures, landing)

    if (!topOccupant) {
        return figures
    }

    let nextFigures = removePlacementFromBoard(figures, displaced, fromCoord)
    nextFigures = pushToStack(nextFigures, landing, displaced)

    queue.unshift({
        stepperPlacement: cloneFigurePlacement(displaced),
        stepperCoord: landing,
        targetPlacement: cloneFigurePlacement(topOccupant),
        targetCoord: landing,
        cause: 'displacement',
    })

    return nextFigures
}

export function applyMoveToCellFromCoord(
    figures: FiguresSlice,
    params: MoveToCellActionParams,
    fromCoord: CellCoord,
    placement: FigurePlacement,
    ctx: MoveEventContext,
    queue: SteppedOnQueueItem[],
): FiguresSlice {
    const landing: CellCoord = { i: params.x - 1, j: params.y - 1 }
    const displaced = resolvePlacementSnapshot(figures, fromCoord, placement)

    if (!isCoordInGrid(landing, ctx.boardParameters.n, ctx.boardParameters.m)) {
        logFigureActionApply({
            context: 'applyMoveToCellFromCoord',
            gameAction: { type: GameActionType.moveToCell, params },
            subject: displaced.figureId,
            result: 'skipped',
            reason: 'target cell outside board',
            detail: { fromCoord, landing },
        })
        return figures
    }

    if (coordsEqual(fromCoord, landing)) {
        return figures
    }

    const landingOccupied = isStackOccupied(figures, landing)
    const topOccupant = getTopOfStack(figures, landing)

    if (landingOccupied && topOccupant && topOccupant.instanceId !== displaced.instanceId) {
        gameMovesDebugLog.displace({
            placement: displaced,
            from: fromCoord,
            to: landing,
            params: { dx: landing.i - fromCoord.i, dy: landing.j - fromCoord.j },
            blocked: true,
            ownerFigureId: ctx.ownerFigureId,
            eventType: ctx.eventType,
        })
        logFigureDisplaceDebug({
            context: 'applyMoveToCellFromCoord',
            subject: displaced.figureId,
            from: fromCoord,
            to: landing,
            params: { dx: landing.i - fromCoord.i, dy: landing.j - fromCoord.j },
            result: 'blocked',
            reason: 'landing occupied; queued displacement chain',
        })
        return enqueueSteppedOnForOccupiedLanding(figures, displaced, fromCoord, landing, queue)
    }

    logFigureActionApply({
        context: 'applyMoveToCellFromCoord',
        gameAction: { type: GameActionType.moveToCell, params },
        subject: displaced.figureId,
        result: 'applied',
        detail: { fromCoord, landing },
    })

    return movePlacementToCoord(figures, displaced, fromCoord, landing)
}
