import { resolveColorValueOrDefault } from './resolveColorValue'
import { FigureViewParams } from './types/figures'

export const DEFAULT_FIGURE_TEXT_SHADOW_COLOR = '#000000'
export const DEFAULT_FIGURE_TEXT_SHADOW_OFFSET_X = 1
export const DEFAULT_FIGURE_TEXT_SHADOW_OFFSET_Y = 1
export const DEFAULT_FIGURE_TEXT_SHADOW_BLUR = 2

export function getDefaultFigureTextShadowParams(): Pick<
    FigureViewParams,
    | 'textShadowEnabled'
    | 'textShadowColor'
    | 'textShadowOffsetX'
    | 'textShadowOffsetY'
    | 'textShadowBlur'
> {
    return {
        textShadowEnabled: false,
        textShadowColor: DEFAULT_FIGURE_TEXT_SHADOW_COLOR,
        textShadowOffsetX: DEFAULT_FIGURE_TEXT_SHADOW_OFFSET_X,
        textShadowOffsetY: DEFAULT_FIGURE_TEXT_SHADOW_OFFSET_Y,
        textShadowBlur: DEFAULT_FIGURE_TEXT_SHADOW_BLUR,
    }
}

export function isFigureTextShadowEnabled(viewParams: FigureViewParams): boolean {
    return viewParams.textShadowEnabled === true
}

export function resolveFigureTextShadowColor(viewParams: FigureViewParams): string {
    return resolveColorValueOrDefault(viewParams.textShadowColor, DEFAULT_FIGURE_TEXT_SHADOW_COLOR)
}

export function resolveFigureTextShadowOffsetX(viewParams: FigureViewParams): number {
    const value = viewParams.textShadowOffsetX

    return typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_FIGURE_TEXT_SHADOW_OFFSET_X
}

export function resolveFigureTextShadowOffsetY(viewParams: FigureViewParams): number {
    const value = viewParams.textShadowOffsetY

    return typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_FIGURE_TEXT_SHADOW_OFFSET_Y
}

export function resolveFigureTextShadowBlur(viewParams: FigureViewParams): number {
    const value = viewParams.textShadowBlur

    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : DEFAULT_FIGURE_TEXT_SHADOW_BLUR
}
