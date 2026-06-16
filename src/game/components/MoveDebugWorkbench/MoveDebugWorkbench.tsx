import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cn from 'classnames'
import { setProfilerPanelChannel } from '../../../profiler'
import { useGameContext } from '../../context'
import { applyFigureMove } from '../../events/applyFigureMove'
import { getTopOfStack } from '../../figureStack'
import { computeFigureMoveSteps } from '../../figureAnimation/figureStepRecorder'
import {
    createEmptyFigureBoardAnimationState,
    FigureBoardAnimationState,
    playStepAnimation,
} from '../../figureAnimation/playStepAnimation'
import {
    isInstantFigureAnimation,
    resolveFigureAnimationSettings,
} from '../../figureAnimation/resolveFigureAnimationSettings'
import {
    compareFigureBoards,
    emptyFiguresSlice,
    FigureBoardCompareResult,
} from '../../moveDebug/compareFigureBoards'
import {
    createDebugBoardParameters,
    DEFAULT_DEBUG_BOARD_SIZE,
} from '../../moveDebug/createDebugBoardParameters'
import {
    beginMoveDebugChain,
    collectMoveDebugChain,
} from '../../moveDebug/moveDebugChainCollector'
import {
    createMoveDebugLogEntry,
    createMoveDebugChainLogEntries,
    createMoveDebugSaveLogEntry,
    logMoveDebugSnapshot,
    logMoveDebugStep,
    MoveDebugLogEntry,
    resetMoveDebugLogSeq,
    saveMoveDebugSessionToProject,
} from '../../moveDebug/moveDebugSessionLog'
import { cloneFiguresSlice } from '../../state/reconcile'
import { FiguresSlice } from '../../state/slices'
import { CellCoord, coordKey } from '../../types/coords'
import { DebugMiniBoard } from './DebugMiniBoard'
import { MoveDebugLog } from './MoveDebugLog'
import styles from './MoveDebugWorkbench.module.css'

export type MoveDebugPhase = 'arrangeBefore' | 'arrangeAfter' | 'playMove' | 'done'

function appendEntries(
    prev: MoveDebugLogEntry[],
    ...entries: MoveDebugLogEntry[]
): MoveDebugLogEntry[] {
    return [...prev, ...entries]
}

export const MoveDebugWorkbench: FC = () => {
    const { activeFigure, figureCatalog } = useGameContext()

    const [phase, setPhase] = useState<MoveDebugPhase>('arrangeBefore')
    const [boardN, setBoardN] = useState(DEFAULT_DEBUG_BOARD_SIZE)
    const [boardM, setBoardM] = useState(DEFAULT_DEBUG_BOARD_SIZE)
    const [beforeSlice, setBeforeSlice] = useState<FiguresSlice>(() => emptyFiguresSlice())
    const [afterSlice, setAfterSlice] = useState<FiguresSlice>(() => emptyFiguresSlice())
    const [sessionLog, setSessionLog] = useState<MoveDebugLogEntry[]>([])
    const [compareResult, setCompareResult] = useState<FigureBoardCompareResult | null>(null)
    const [displayFiguresSlice, setDisplayFiguresSlice] = useState<FiguresSlice | undefined>(undefined)
    const [figureBoardAnimations, setFigureBoardAnimations] = useState<FigureBoardAnimationState>(
        () => createEmptyFigureBoardAnimationState(),
    )
    const [isAnimating, setIsAnimating] = useState(false)

    const isMoveInProgressRef = useRef(false)
    const profilerChannelRestoredRef = useRef(false)
    const sessionLogRef = useRef<MoveDebugLogEntry[]>([])

    const appendSessionLog = useCallback((
        ...entries: MoveDebugLogEntry[]
    ): MoveDebugLogEntry[] => {
        const next = appendEntries(sessionLogRef.current, ...entries)
        sessionLogRef.current = next
        setSessionLog(next)
        return next
    }, [])

    const boardParameters = useMemo(
        () => createDebugBoardParameters(boardN, boardM),
        [boardN, boardM],
    )

    const catalog = figureCatalog ?? []

    const resetWorkbench = useCallback(() => {
        resetMoveDebugLogSeq()
        setPhase('arrangeBefore')
        setBeforeSlice(emptyFiguresSlice())
        setAfterSlice(emptyFiguresSlice())
        setSessionLog([])
        sessionLogRef.current = []
        setCompareResult(null)
        setDisplayFiguresSlice(undefined)
        setFigureBoardAnimations(createEmptyFigureBoardAnimationState())
        setIsAnimating(false)
        isMoveInProgressRef.current = false
    }, [])

    useEffect(() => {
        resetWorkbench()
    }, [boardN, boardM, resetWorkbench])

    useEffect(() => {
        if (!import.meta.env.DEV) {
            return
        }

        setProfilerPanelChannel('gameplay')
        profilerChannelRestoredRef.current = false

        return () => {
            if (!profilerChannelRestoredRef.current) {
                setProfilerPanelChannel('scroll')
                profilerChannelRestoredRef.current = true
            }
        }
    }, [])

    const handleBeforeSliceChange = useCallback((slice: FiguresSlice) => {
        if (phase !== 'arrangeBefore') {
            return
        }

        setBeforeSlice(slice)
        setAfterSlice(cloneFiguresSlice(slice))
    }, [phase])

    const handleAfterSliceChange = useCallback((slice: FiguresSlice) => {
        if (phase !== 'arrangeAfter') {
            return
        }

        setAfterSlice(slice)
    }, [phase])

    const handleConfirmBoard2 = useCallback(() => {
        if (phase !== 'arrangeBefore') {
            return
        }

        appendSessionLog(
            logMoveDebugStep('Phase: arrangeAfter'),
            logMoveDebugSnapshot('expected after (initial)', afterSlice),
        )
        setPhase('arrangeAfter')
    }, [phase, afterSlice, appendSessionLog])

    const handleConfirmBoard1 = useCallback(() => {
        if (phase !== 'arrangeAfter') {
            return
        }

        appendSessionLog(
            logMoveDebugStep('Phase: playMove'),
            logMoveDebugSnapshot('before move', beforeSlice),
        )
        setPhase('playMove')
    }, [phase, beforeSlice, appendSessionLog])

    const waitForAnimationCompletion = useCallback((durationMs: number) => {
        return new Promise<void>(resolve => {
            window.setTimeout(resolve, durationMs + 16)
        })
    }, [])

    const playLocalFigureStepSequence = useCallback(async (
        steps: FiguresSlice[],
    ) => {
        const settings = resolveFigureAnimationSettings(boardParameters)

        setIsAnimating(true)
        setDisplayFiguresSlice(steps[0])

        try {
            for (let i = 1; i < steps.length; i += 1) {
                await playStepAnimation(
                    steps[i - 1],
                    steps[i],
                    boardParameters,
                    settings,
                    setFigureBoardAnimations,
                    waitForAnimationCompletion,
                )
                setDisplayFiguresSlice(steps[i])
            }
        } finally {
            setFigureBoardAnimations(createEmptyFigureBoardAnimationState())
            setDisplayFiguresSlice(undefined)
            setIsAnimating(false)
        }
    }, [boardParameters, waitForAnimationCompletion])

    const handleMove = useCallback((from: CellCoord, to: CellCoord) => {
        if (phase !== 'playMove' || isMoveInProgressRef.current || isAnimating) {
            return
        }

        const fromPlacement = getTopOfStack(beforeSlice, from)

        if (!fromPlacement) {
            return
        }

        isMoveInProgressRef.current = true

        const moveInput = {
            from,
            to,
            actorPlacement: fromPlacement,
            targetAtTo: getTopOfStack(beforeSlice, to),
            swapOnEat: boardParameters.swapOnEat,
            boardParameters,
            catalog,
        }

        const animationSettings = resolveFigureAnimationSettings(boardParameters)

        appendSessionLog(
            logMoveDebugStep('Move start', { from, to }),
            logMoveDebugSnapshot('beforeMove', beforeSlice),
        )

        beginMoveDebugChain()

        void (async () => {
            try {
                let result: FiguresSlice

                if (isInstantFigureAnimation(animationSettings)) {
                    result = applyFigureMove(beforeSlice, moveInput)
                    setBeforeSlice(result)
                } else {
                    const steps = computeFigureMoveSteps(beforeSlice, moveInput)
                    await playLocalFigureStepSequence(steps)
                    result = steps[steps.length - 1]
                    setBeforeSlice(result)
                }

                const compare = compareFigureBoards(result, afterSlice)
                setCompareResult(compare)

                const moveChain = collectMoveDebugChain()
                const chainLogEntries = createMoveDebugChainLogEntries(moveChain)

                const logForSave = appendSessionLog(
                    logMoveDebugStep('Event chain', { from, to, stepCount: moveChain.length }),
                    ...chainLogEntries,
                    logMoveDebugSnapshot('afterMove', result),
                    createMoveDebugLogEntry(
                        'compare',
                        compare.match ? '✓ Compare: match' : `✗ Compare: ${compare.mismatches.length} mismatch(es)`,
                        compare,
                    ),
                    logMoveDebugStep('Phase: done'),
                )

                const saveResult = await saveMoveDebugSessionToProject({
                    phase: 'done',
                    boardSize: { n: boardN, m: boardM },
                    move: { from, to },
                    chain: moveChain,
                    compare,
                    entries: logForSave,
                })

                appendSessionLog(createMoveDebugSaveLogEntry(saveResult))
                setPhase('done')
            } finally {
                isMoveInProgressRef.current = false
            }
        })()
    }, [
        phase,
        isAnimating,
        beforeSlice,
        afterSlice,
        boardParameters,
        catalog,
        playLocalFigureStepSequence,
        boardN,
        boardM,
        appendSessionLog,
    ])

    const board1Mode = phase === 'arrangeBefore'
        ? 'arrange'
        : phase === 'playMove'
            ? 'game'
            : 'readonly'

    const board2Mode = phase === 'arrangeAfter' ? 'arrange' : 'readonly'

    const board1InteractionDisabled = phase === 'arrangeAfter' || phase === 'done' || isAnimating
    const board2InteractionDisabled = phase !== 'arrangeAfter' || isAnimating

    const phaseHint = phase === 'arrangeBefore'
        ? 'Arrange board 1 (before). Board 2 mirrors. Confirm board 2 when ready.'
        : phase === 'arrangeAfter'
            ? 'Arrange board 2 (expected after). Confirm board 1 to play one move.'
            : phase === 'playMove'
                ? 'Play one move on board 1.'
                : 'Move complete. Reset to start over.'

    return (
        <div className={styles.workbench}>
            <div className={styles.header}>
                <h2 className={styles.headerTitle}>Move debug</h2>
                <div className={styles.sizeInputs}>
                    <label>
                        n
                        <input
                            className={styles.sizeInput}
                            type="number"
                            min={1}
                            max={12}
                            value={boardN}
                            disabled={isAnimating}
                            onChange={event => setBoardN(Math.max(1, Math.trunc(Number(event.target.value) || 1)))}
                        />
                    </label>
                    <span>×</span>
                    <label>
                        m
                        <input
                            className={styles.sizeInput}
                            type="number"
                            min={1}
                            max={12}
                            value={boardM}
                            disabled={isAnimating}
                            onChange={event => setBoardM(Math.max(1, Math.trunc(Number(event.target.value) || 1)))}
                        />
                    </label>
                </div>
                <button
                    type="button"
                    className={styles.resetButton}
                    disabled={isAnimating}
                    onClick={resetWorkbench}
                >
                    Reset
                </button>
            </div>

            <p className={styles.phaseHint}>{phaseHint}</p>

            <div className={styles.boardBlock}>
                <div className={styles.boardHeader}>
                    <button
                        type="button"
                        className={cn(
                            styles.confirmButton,
                            phase === 'arrangeAfter' && styles.confirmButtonActive,
                        )}
                        disabled={phase !== 'arrangeAfter' || isAnimating}
                        title="Confirm board 1 — start move"
                        onClick={handleConfirmBoard1}
                    >
                        ✓
                    </button>
                    <span>Board 1 — до хода</span>
                </div>
                <DebugMiniBoard
                    figuresSlice={beforeSlice}
                    displayFiguresSlice={displayFiguresSlice ?? beforeSlice}
                    boardParameters={boardParameters}
                    mode={board1Mode}
                    activeFigure={activeFigure}
                    figureCatalog={catalog}
                    figureBoardAnimations={figureBoardAnimations}
                    interactionDisabled={board1InteractionDisabled}
                    onSliceChange={handleBeforeSliceChange}
                    onMove={handleMove}
                />
            </div>

            <div className={styles.boardBlock}>
                <div className={styles.boardHeader}>
                    <button
                        type="button"
                        className={cn(
                            styles.confirmButton,
                            phase === 'arrangeBefore' && styles.confirmButtonActive,
                        )}
                        disabled={phase !== 'arrangeBefore' || isAnimating}
                        title="Confirm board 2 — edit expected after"
                        onClick={handleConfirmBoard2}
                    >
                        ✓
                    </button>
                    <span>Board 2 — expected после</span>
                </div>
                <DebugMiniBoard
                    figuresSlice={afterSlice}
                    boardParameters={boardParameters}
                    mode={board2Mode}
                    activeFigure={activeFigure}
                    figureCatalog={catalog}
                    interactionDisabled={board2InteractionDisabled}
                    onSliceChange={handleAfterSliceChange}
                />
            </div>

            <MoveDebugLog entries={sessionLog} compareResult={compareResult} />
        </div>
    )
}
