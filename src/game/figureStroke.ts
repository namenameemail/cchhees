import { resolveColorValueOrDefault } from './resolveColorValue'
import { FigureViewParams } from './types/figures'

export const DEFAULT_FIGURE_STROKE_COLOR = 'black'

export function getDefaultFigureStrokeParams(): Pick<
    FigureViewParams,
    'strokeWidth' | 'strokeColor' | 'strokeDasharray'
> {
    return {
        strokeWidth: 0,
        strokeColor: DEFAULT_FIGURE_STROKE_COLOR,
        strokeDasharray: undefined,
    }
}

export function resolveFigureStrokeWidth(viewParams: FigureViewParams): number {
    const value = viewParams.strokeWidth

    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

export function resolveFigureStrokeColor(viewParams: FigureViewParams): string {
    return resolveColorValueOrDefault(viewParams.strokeColor, DEFAULT_FIGURE_STROKE_COLOR)
}

export function resolveFigureStrokeDasharray(viewParams: FigureViewParams): string | undefined {
    const value = viewParams.strokeDasharray?.trim()

    return value || undefined
}

export function hasFigureStroke(viewParams: FigureViewParams): boolean {
    return resolveFigureStrokeWidth(viewParams) > 0
}
