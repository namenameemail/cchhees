import {
    BoardFigureAnimationSettings,
    BoardParameters,
} from '../types/boardParameters'

export const DEFAULT_MOVE_DURATION_MS = 250
export const DEFAULT_FADE_DURATION_MS = 200
const MAX_DURATION_MS = 2000

export interface ResolvedFigureAnimationSettings {
    moveDurationMs: number
    fadeDurationMs: number
}

function clampDuration(value: number | undefined, fallback: number): number {
    if (value === undefined || !Number.isFinite(value)) {
        return fallback
    }

    return Math.min(MAX_DURATION_MS, Math.max(0, Math.trunc(value)))
}

export function resolveFigureAnimationSettings(
    boardParameters: BoardParameters,
): ResolvedFigureAnimationSettings {
    const settings = boardParameters.figureAnimation

    return {
        moveDurationMs: clampDuration(settings?.moveDurationMs, DEFAULT_MOVE_DURATION_MS),
        fadeDurationMs: clampDuration(settings?.fadeDurationMs, DEFAULT_FADE_DURATION_MS),
    }
}

export function isInstantFigureAnimation(settings: ResolvedFigureAnimationSettings): boolean {
    return settings.moveDurationMs === 0 && settings.fadeDurationMs === 0
}

export function normalizeBoardFigureAnimationSettings(
    settings?: BoardFigureAnimationSettings,
): BoardFigureAnimationSettings {
    return {
        moveDurationMs: clampDuration(settings?.moveDurationMs, DEFAULT_MOVE_DURATION_MS),
        fadeDurationMs: clampDuration(settings?.fadeDurationMs, DEFAULT_FADE_DURATION_MS),
    }
}
