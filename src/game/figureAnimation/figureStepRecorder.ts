import { FiguresSlice } from '../state/slices'
import { cloneFiguresSlice } from '../state/reconcile'
import { applyFigureMove, ApplyFigureMoveInput } from '../events/applyFigureMove'

export interface FigureStepMeta {
    /** instanceId -> направление ухода с доски (dx/dy смещения, приведшего к leaveBoard) */
    exitHints?: Record<string, { dx: number; dy: number }>
}

export type FigureStepRecorder = (slice: FiguresSlice, meta?: FigureStepMeta) => void

export function recordFigureStep(
    onStep: FigureStepRecorder | undefined,
    slice: FiguresSlice,
    meta?: FigureStepMeta,
): void {
    if (onStep) {
        onStep(cloneFiguresSlice(slice), meta)
    }
}

export interface FigureMoveStepsResult {
    steps: FiguresSlice[]
    exitHints: Record<string, { dx: number; dy: number }>
}

export function computeFigureMoveSteps(
    figures: FiguresSlice,
    input: ApplyFigureMoveInput,
): FigureMoveStepsResult {
    const steps: FiguresSlice[] = [cloneFiguresSlice(figures)]
    const exitHints: Record<string, { dx: number; dy: number }> = {}

    const onStep: FigureStepRecorder = (slice, meta) => {
        steps.push(cloneFiguresSlice(slice))

        if (meta?.exitHints) {
            Object.assign(exitHints, meta.exitHints)
        }
    }

    applyFigureMove(figures, {
        ...input,
        onStep,
    })

    return { steps, exitHints }
}
