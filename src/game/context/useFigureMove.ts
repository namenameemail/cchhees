import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { Mode } from '../types'
import { CellCoord, coordsEqual } from '../types/coords'
import { FigureCatalog, FigureTeams } from '../types/figures'
import { FigureEventRule } from '../types/events'
import { BoardParameters } from '../types/boardParameters'
import { BoardSlice, FiguresSlice } from '../state/slices'
import { applyFigureMove } from '../events/applyFigureMove'
import { computeFigureMoveSteps } from '../figureAnimation/figureStepRecorder'
import {
    isInstantFigureAnimation,
    resolveFigureAnimationSettings,
} from '../figureAnimation/resolveFigureAnimationSettings'
import { getTopOfStack } from '../figureStack'
import { isFigureMoveAllowed } from '../moveRules'
import { resolveFigureDefinition } from '../figureView'

export function useFigureMove(options: {
    mode: Mode
    activeCell: CellCoord | undefined
    figuresSlice: FiguresSlice
    figureCatalog: FigureCatalog
    figureTeams: FigureTeams
    eventRules: FigureEventRule[]
    boardParameters: BoardParameters
    isFigureAnimating: boolean
    isMoveAnimatingRef: MutableRefObject<boolean>
    prevFiguresSliceRef: MutableRefObject<FiguresSlice>
    setActiveCell: (value: CellCoord | undefined, reason?: string) => void
    pushFiguresChange: (nextFigures: FiguresSlice) => void
    playFigureStepSequenceLocal: (steps: FiguresSlice[], boardParameters: BoardParameters) => Promise<void>
    freeMove?: boolean
}) {
    const {
        mode,
        activeCell,
        figuresSlice,
        figureCatalog,
        figureTeams,
        eventRules,
        boardParameters,
        isFigureAnimating,
        isMoveAnimatingRef,
        prevFiguresSliceRef,
        setActiveCell,
        pushFiguresChange,
        playFigureStepSequenceLocal,
        freeMove,
    } = options

    return useCallback((to: CellCoord) => {
        if (isFigureAnimating || isMoveAnimatingRef.current) {
            return
        }

        if (activeCell === undefined) {
            return
        }

        if (coordsEqual(activeCell, to)) {
            setActiveCell(undefined, 'move to same cell')
            return
        }

        const from = activeCell
        const fromPlacement = getTopOfStack(figuresSlice, from)
        if (!fromPlacement) {
            return
        }

        const figureDefinition = resolveFigureDefinition(fromPlacement.figureId, figureCatalog)

        if (!isFigureMoveAllowed(
            from,
            to,
            figureDefinition,
            figuresSlice.figuresByCoord,
            boardParameters,
            fromPlacement,
            figureCatalog,
            freeMove,
            figureTeams,
        )) {
            return
        }

        setActiveCell(undefined, 'figure move start')

        const targetAtTo = getTopOfStack(figuresSlice, to)
        const moveInput = {
            from,
            to,
            actorPlacement: fromPlacement,
            targetAtTo,
            swapOnEat: boardParameters.swapOnEat,
            boardParameters,
            catalog: figureCatalog,
            figureTeams,
            eventRules,
        }

        const animationSettings = resolveFigureAnimationSettings(boardParameters)

        if (mode !== Mode.Game || isInstantFigureAnimation(animationSettings)) {
            pushFiguresChange(applyFigureMove(figuresSlice, moveInput))
            return
        }

        const steps = computeFigureMoveSteps(figuresSlice, moveInput)
        isMoveAnimatingRef.current = true

        void (async () => {
            try {
                await playFigureStepSequenceLocal(steps, boardParameters)
                pushFiguresChange(steps[steps.length - 1])
            } finally {
                isMoveAnimatingRef.current = false
                prevFiguresSliceRef.current = steps[steps.length - 1]
            }
        })()
    }, [
        activeCell,
        figuresSlice,
        figureCatalog,
        figureTeams,
        eventRules,
        boardParameters,
        pushFiguresChange,
        setActiveCell,
        mode,
        isFigureAnimating,
        playFigureStepSequenceLocal,
        isMoveAnimatingRef,
        prevFiguresSliceRef,
        freeMove,
    ])
}
