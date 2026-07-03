import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { Mode } from '../types'
import { CellCoord, coordsEqual } from '../types/coords'
import { FigureCatalog, FigurePlacement, FigureTeams } from '../types/figures'
import { FigureEventRule } from '../types/events'
import { BoardParameters } from '../types/boardParameters'
import { FiguresSlice } from '../state/slices'
import { applyFigureMove } from '../events/applyFigureMove'
import { computeFigureMoveSteps } from '../figureAnimation/figureStepRecorder'
import { ExitHints } from '../figureAnimation/playStepAnimation'
import {
    isInstantFigureAnimation,
    resolveFigureAnimationSettings,
} from '../figureAnimation/resolveFigureAnimationSettings'
import { getTopOfStack } from '../figureStack'
import { isFigureMoveAllowed } from '../moveRules'
import { resolveFigureDefinition } from '../figureView'
import { cloneFiguresSlice } from '../state/reconcile'
import { beginMoveDebugChain, collectMoveDebugChain } from '../moveDebug/moveDebugChainCollector'
import { buildFigureMoveDebugInfo } from '../moveDebug/figureMoveDebugInfo'
import {
    appendMoveRecMove,
    isMoveRecActive,
    saveMoveRecToProject,
} from '../moveDebug/moveRecLog'

function recordCompletedMove(options: {
    from: CellCoord
    to: CellCoord
    before: FiguresSlice
    after: FiguresSlice
    actorPlacement: FigurePlacement
    targetAtTo?: FigurePlacement
    catalog: FigureCatalog
    boardParameters: BoardParameters
    figureTeams: FigureTeams
    onMoveRecRecorded?: () => void
}): void {
    appendMoveRecMove({
        from: options.from,
        to: options.to,
        before: options.before,
        after: options.after,
        chain: collectMoveDebugChain(),
        actorFigure: buildFigureMoveDebugInfo(
            options.catalog,
            options.actorPlacement,
            options.boardParameters,
            options.figureTeams,
        ),
        targetFigure: options.targetAtTo
            ? buildFigureMoveDebugInfo(
                options.catalog,
                options.targetAtTo,
                options.boardParameters,
                options.figureTeams,
            )
            : undefined,
    })

    void saveMoveRecToProject().finally(() => {
        options.onMoveRecRecorded?.()
    })
}

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
    playFigureStepSequenceLocal: (
        steps: FiguresSlice[],
        boardParameters: BoardParameters,
        exitHints?: ExitHints,
    ) => Promise<void>
    freeMove?: boolean
    onMoveRecRecorded?: () => void
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
        onMoveRecRecorded,
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

        const recording = isMoveRecActive()
        const beforeSlice = recording ? cloneFiguresSlice(figuresSlice) : null

        if (recording) {
            beginMoveDebugChain()
        }

        const animationSettings = resolveFigureAnimationSettings(boardParameters)

        if (mode !== Mode.Game || isInstantFigureAnimation(animationSettings)) {
            const after = applyFigureMove(figuresSlice, moveInput)
            pushFiguresChange(after)

            if (recording && beforeSlice) {
                recordCompletedMove({
                    from,
                    to,
                    before: beforeSlice,
                    after,
                    actorPlacement: fromPlacement,
                    targetAtTo,
                    catalog: figureCatalog,
                    boardParameters,
                    figureTeams,
                    onMoveRecRecorded,
                })
            }

            return
        }

        const { steps, exitHints } = computeFigureMoveSteps(figuresSlice, moveInput)
        isMoveAnimatingRef.current = true

        void (async () => {
            try {
                await playFigureStepSequenceLocal(steps, boardParameters, exitHints)
                const after = steps[steps.length - 1]
                pushFiguresChange(after)

                if (recording && beforeSlice) {
                    recordCompletedMove({
                        from,
                        to,
                        before: beforeSlice,
                        after,
                        actorPlacement: fromPlacement,
                        targetAtTo,
                        catalog: figureCatalog,
                        boardParameters,
                        figureTeams,
                        onMoveRecRecorded,
                    })
                }
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
        onMoveRecRecorded,
    ])
}
