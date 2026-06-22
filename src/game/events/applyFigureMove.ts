import { BoardParameters } from '../types/boardParameters'
import { CellCoord } from '../types/coords'
import { FigureCatalog, FigurePlacement, FigureTeams } from '../types/figures'
import { FigureEventRule } from '../types/events'
import { FiguresSlice } from '../state/slices'
import { cloneFigurePlacement, normalizeFigureMoveRules, resolveFigureMoveDirectionFromCatalog, resolveFigureState, resolvePlacementStateIndex } from '../figureView'
import { buildFigureMoveDebugInfo } from '../moveDebug/figureMoveDebugInfo'
import {
    collectHoppedFigures,
    resolveJumpOverPieces,
} from '../moveRules'
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
    figureTeams?: FigureTeams
    eventRules: FigureEventRule[]
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
        actorFigure: buildFigureMoveDebugInfo(input.catalog, input.actorPlacement, input.figureTeams),
        targetFigure: input.targetAtTo
            ? buildFigureMoveDebugInfo(input.catalog, input.targetAtTo, input.figureTeams)
            : undefined,
    })

    const figuresBeforeMove = cloneFiguresByCoord(figures.figuresByCoord)

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

    const actorDefinition = input.catalog.find(entry => entry.id === input.actorPlacement.figureId)
    const actorState = actorDefinition
        ? resolveFigureState(actorDefinition, resolvePlacementStateIndex(input.actorPlacement))
        : undefined
    const moveRules = normalizeFigureMoveRules(actorState?.moveRules)
    const hoppedFigures = collectHoppedFigures(
        input.from,
        input.to,
        moveRules,
        resolveJumpOverPieces(actorState ?? {}),
        figuresBeforeMove,
        resolveFigureMoveDirectionFromCatalog(input.catalog, input.actorPlacement.figureId, input.figureTeams),
    )
    const eatedFigures = input.swapOnEat && input.targetAtTo
        ? [cloneFigurePlacement(input.targetAtTo)]
        : undefined

    if (steppedOnQueue.length > 0) {
        afterMove = resolveSteppedOnQueue(
            afterMove,
            steppedOnQueue,
            input.catalog,
            input.eventRules,
            input.boardParameters,
            input.onStep,
        )
    }

    const eventContext: MoveEventContext = {
        from: input.from,
        to: input.to,
        actorPlacement: input.actorPlacement,
        targetAtTo: input.targetAtTo,
        swappedTargetCoord,
        boardParameters: input.boardParameters,
        catalog: input.catalog,
        eventRules: input.eventRules,
        stepCause: 'manual',
        stepperPlacement: input.actorPlacement,
        stepperCoord: input.to,
        figuresBeforeMove,
        hoppedFigures,
        eatedFigures,
        onStep: input.onStep,
    }

    return runFigureEvents(afterMove, eventContext)
}
