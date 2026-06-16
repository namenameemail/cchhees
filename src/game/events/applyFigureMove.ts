import { CellCoord, coordKey } from '../types/coords'
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

    const figuresBeforeMove = Object.fromEntries(
        Object.entries(figures.figuresByCoord).map(([key, placement]) => [
            key,
            cloneFigurePlacement(placement),
        ]),
    )

    const fromKey = coordKey(input.from)
    const toKey = coordKey(input.to)
    const figuresByCoord = { ...figures.figuresByCoord }
    const tray = [...figures.tray]

    let capturedPlacement: FigurePlacement | undefined
    let swappedTargetCoord: CellCoord | undefined
    const steppedOnQueue: SteppedOnEvent[] = []
    let deferActorPlacement = false

    if (input.swapOnEat) {
        figuresByCoord[toKey] = cloneFigurePlacement(input.actorPlacement)

        if (input.targetAtTo) {
            figuresByCoord[fromKey] = cloneFigurePlacement(input.targetAtTo)
            swappedTargetCoord = input.from
        } else {
            delete figuresByCoord[fromKey]
        }
    } else {
        delete figuresByCoord[fromKey]

        if (input.targetAtTo) {
            deferActorPlacement = true
            steppedOnQueue.push({
                stepperPlacement: cloneFigurePlacement(input.actorPlacement),
                stepperCoord: input.from,
                targetPlacement: cloneFigurePlacement(input.targetAtTo),
                targetCoord: input.to,
                cause: 'manual',
            })
        } else {
            figuresByCoord[toKey] = cloneFigurePlacement(input.actorPlacement)
        }
    }

    let afterMove: FiguresSlice = {
        figuresByCoord,
        tray,
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

    if (deferActorPlacement) {
        afterMove = {
            ...afterMove,
            figuresByCoord: {
                ...afterMove.figuresByCoord,
                [toKey]: cloneFigurePlacement(input.actorPlacement),
            },
        }
        recordFigureStep(input.onStep, afterMove)
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
        stepperCoord: input.from,
        figuresBeforeMove,
        onStep: input.onStep,
    }

    return runFigureEvents(afterMove, eventContext)
}
