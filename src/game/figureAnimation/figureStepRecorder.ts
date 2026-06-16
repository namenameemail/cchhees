import { FiguresSlice } from '../state/slices'
import { cloneFiguresSlice } from '../state/reconcile'
import { applyFigureMove, ApplyFigureMoveInput } from '../events/applyFigureMove'

export type FigureStepRecorder = (slice: FiguresSlice) => void

export function recordFigureStep(
    onStep: FigureStepRecorder | undefined,
    slice: FiguresSlice,
): void {
    if (onStep) {
        onStep(cloneFiguresSlice(slice))
    }
}

export function computeFigureMoveSteps(
    figures: FiguresSlice,
    input: ApplyFigureMoveInput,
): FiguresSlice[] {
    const steps: FiguresSlice[] = [cloneFiguresSlice(figures)]

    const onStep: FigureStepRecorder = (slice) => {
        steps.push(cloneFiguresSlice(slice))
    }

    applyFigureMove(figures, {
        ...input,
        onStep,
    })

    return steps
}
