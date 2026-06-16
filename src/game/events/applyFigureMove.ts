import { CellCoord } from '../types/coords'
import { FigurePlacement } from '../types/figures'
import { BoardParameters } from '../types/boardParameters'
import { FigureCatalog } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import { cloneFigurePlacement } from '../figureView'
import { recordFigureStep, FigureStepRecorder } from '../figureAnimation/figureStepRecorder'
import { runFigureEvents } from './runFigureEvents'
import { resolveSteppedOnQueue, SteppedOnEvent } from './steppedOnQueue'
import { MoveEventContext } from './types'
import { gameMovesDebugLog } from '../gameMovesDebugLog'
import {
    cloneFiguresByCoord,
    pushToStack,
    removePlacementFromBoard,
} from '../figureStack'

export interface ApplyFigureMoveInput {
    from: CellCoord
    to: CellCoord
    actorPlacement: FigurePlacement
    targetAtTo?: FigurePlacement
    swapOnEat: boolean
    boardParameters: BoardParameters
    catalog: FigureCatalog
    onStep?: FigureStepRecorder
}

export function applyFigureMove(
    figures: FiguresSlice,
    input: ApplyFigureMoveInput,
): FiguresSlice {
    gameMovesDebugLog.moveStart({
        from: input.from,
        to: input.to,
        actor: input.actorPlacement,
        target: input.targetAtTo,
        swapOnEat: input.swapOnEat,
    })

    const figuresBeforeMove = cloneFiguresByCoord(figures.figuresByCoord)

    let capturedPlacement: FigurePlacement | undefined
    let swappedTargetCoord: CellCoord | undefined
    const steppedOnQueue: SteppedOnEvent[] = []
    let afterMove: FiguresSlice = {
        figuresByCoord: cloneFiguresByCoord(figures.figuresByCoord),
        tray: [...figures.tray],
    }

    if (input.swapOnEat) {
        afterMove = removePlacementFromBoard(afterMove, input.actorPlacement, input.from)
        afterMove = removePlacementFromBoard(afterMove, input.targetAtTo!, input.to)
        afterMove = pushToStack(afterMove, input.to, input.actorPlacement)

        if (input.targetAtTo) {
            afterMove = pushToStack(afterMove, input.from, input.targetAtTo)
            swappedTargetCoord = input.from
        }
    } else {
        afterMove = removePlacementFromBoard(afterMove, input.actorPlacement, input.from)

        if (input.targetAtTo) {
            afterMove = pushToStack(afterMove, input.to, input.actorPlacement)
            steppedOnQueue.push({
                stepperPlacement: cloneFigurePlacement(input.actorPlacement),
                stepperCoord: input.to,
                targetPlacement: cloneFigurePlacement(input.targetAtTo),
                targetCoord: input.to,
                cause: 'manual',
            })
        } else {
            afterMove = pushToStack(afterMove, input.to, input.actorPlacement)
        }
    }

    recordFigureStep(input.onStep, afterMove)

    if (steppedOnQueue.length > 0) {
        afterMove = resolveSteppedOnQueue(
            afterMove,
            steppedOnQueue,
            input.catalog,
            input.boardParameters,
            input.onStep,
        )
    }

    const eventContext: MoveEventContext = {
        from: input.from,
        to: input.to,
        actorPlacement: input.actorPlacement,
        targetAtTo: input.targetAtTo,
        capturedPlacement,
        swappedTargetCoord,
        boardParameters: input.boardParameters,
        catalog: input.catalog,
        stepCause: 'manual',
        stepperPlacement: input.actorPlacement,
        stepperCoord: input.to,
        figuresBeforeMove,
        onStep: input.onStep,
    }

    return runFigureEvents(afterMove, eventContext)
}
