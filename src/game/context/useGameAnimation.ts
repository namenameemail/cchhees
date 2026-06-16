import { useCallback, useEffect, useRef, useState } from 'react'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { FiguresSlice, BoardSlice } from '../state/slices'
import {
    createAnimationCompletionWaiter,
    playFigureStepSequence,
} from '../figureAnimation/playFigureStepSequence'
import {
    createEmptyFigureBoardAnimationState,
    FigureBoardAnimationState,
    playStepAnimation,
} from '../figureAnimation/playStepAnimation'
import {
    isInstantFigureAnimation,
    resolveFigureAnimationSettings,
} from '../figureAnimation/resolveFigureAnimationSettings'

export function useGameAnimation(
    figuresSlice: FiguresSlice,
    boardParameters: BoardParameters,
    mode: Mode,
    activeBoardId: string,
) {
    const [displayFiguresSlice, setDisplayFiguresSlice] = useState<FiguresSlice | undefined>(undefined)
    const [isFigureAnimating, setIsFigureAnimating] = useState(false)
    const [figureBoardAnimations, setFigureBoardAnimations] = useState<FigureBoardAnimationState>(
        () => createEmptyFigureBoardAnimationState(),
    )

    const skipFigureAnimationRef = useRef(true)
    const prevFiguresSliceRef = useRef(figuresSlice)
    const isMoveAnimatingRef = useRef(false)

    useEffect(() => {
        skipFigureAnimationRef.current = true
    }, [activeBoardId])

    const waitForAnimationCompletion = useCallback(createAnimationCompletionWaiter(), [])

    const playFigureStepSequenceLocal = useCallback(async (
        steps: FiguresSlice[],
        parameters: BoardParameters,
    ) => {
        setIsFigureAnimating(true)
        setDisplayFiguresSlice(steps[0])

        try {
            await playFigureStepSequence(steps, parameters, {
                onStepDisplay: setDisplayFiguresSlice,
                onAnimationsChange: setFigureBoardAnimations,
                waitForAnimationCompletion,
            })
        } finally {
            setDisplayFiguresSlice(undefined)
            setIsFigureAnimating(false)
        }
    }, [waitForAnimationCompletion])

    useEffect(() => {
        if (skipFigureAnimationRef.current) {
            skipFigureAnimationRef.current = false
            prevFiguresSliceRef.current = figuresSlice
            return
        }

        if (isMoveAnimatingRef.current || mode !== Mode.Game) {
            prevFiguresSliceRef.current = figuresSlice
            return
        }

        const prev = prevFiguresSliceRef.current
        const settings = resolveFigureAnimationSettings(boardParameters)

        if (isInstantFigureAnimation(settings)) {
            prevFiguresSliceRef.current = figuresSlice
            return
        }

        let cancelled = false

        void (async () => {
            setIsFigureAnimating(true)
            setDisplayFiguresSlice(prev)

            try {
                await playStepAnimation(
                    prev,
                    figuresSlice,
                    boardParameters,
                    settings,
                    setFigureBoardAnimations,
                    waitForAnimationCompletion,
                )

                if (!cancelled) {
                    setDisplayFiguresSlice(figuresSlice)
                }
            } finally {
                if (!cancelled) {
                    setDisplayFiguresSlice(undefined)
                    setFigureBoardAnimations(createEmptyFigureBoardAnimationState())
                    setIsFigureAnimating(false)
                    prevFiguresSliceRef.current = figuresSlice
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [figuresSlice, mode, boardParameters, waitForAnimationCompletion])

    return {
        displayFiguresSlice,
        isFigureAnimating,
        figureBoardAnimations,
        isMoveAnimatingRef,
        prevFiguresSliceRef,
        skipFigureAnimationRef,
        playFigureStepSequenceLocal,
    }
}

export type GameAnimationState = ReturnType<typeof useGameAnimation>
