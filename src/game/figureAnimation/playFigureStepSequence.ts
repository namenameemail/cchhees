import { BoardParameters } from '../types/boardParameters'
import { FiguresSlice } from '../state/slices'
import { resolveFigureAnimationSettings } from './resolveFigureAnimationSettings'
import {
    createEmptyFigureBoardAnimationState,
    FigureBoardAnimationState,
    playStepAnimation,
} from './playStepAnimation'

export type FigureStepSequenceController = {
    onStepDisplay: (slice: FiguresSlice) => void
    onAnimationsChange: (state: FigureBoardAnimationState) => void
    waitForAnimationCompletion: (durationMs: number) => Promise<void>
}

export async function playFigureStepSequence(
    steps: FiguresSlice[],
    boardParameters: BoardParameters,
    controller: FigureStepSequenceController,
): Promise<void> {
    if (steps.length === 0) {
        return
    }

    const settings = resolveFigureAnimationSettings(boardParameters)

    controller.onStepDisplay(steps[0])

    try {
        for (let i = 1; i < steps.length; i += 1) {
            await playStepAnimation(
                steps[i - 1],
                steps[i],
                boardParameters,
                settings,
                controller.onAnimationsChange,
                controller.waitForAnimationCompletion,
            )
            controller.onStepDisplay(steps[i])
        }
    } finally {
        controller.onAnimationsChange(createEmptyFigureBoardAnimationState())
    }
}

export function createAnimationCompletionWaiter(): (durationMs: number) => Promise<void> {
    return (durationMs: number) =>
        new Promise<void>(resolve => {
            window.setTimeout(resolve, durationMs + 16)
        })
}
