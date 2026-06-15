export type BoardMarkLayer = 'belowFigures' | 'aboveFigures'

export type BoardMarkFillType = 'none' | 'solid' | 'linear' | 'radial'

export type BoardMarkBlendMode =
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'color-burn'
    | 'hard-light'
    | 'soft-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity'

export type BoardMarkKind = 'selection' | 'legalMove' | 'cursor'

export interface BoardMarkGradientStop {
    offset: number
    color: string
}

export interface BoardMarkFill {
    type: BoardMarkFillType
    color?: string
    stops?: BoardMarkGradientStop[]
    linearX1?: number
    linearY1?: number
    linearX2?: number
    linearY2?: number
    radialCx?: number
    radialCy?: number
    radialR?: number
}

export interface BoardMarkStroke {
    color?: string
    width?: number
    dasharray?: string
}

export interface BoardMarkAppearance {
    fill: BoardMarkFill
    stroke: BoardMarkStroke
    layer: BoardMarkLayer
    mixBlendMode: BoardMarkBlendMode
    overlay?: BoardMarkOverlay
}

export interface BoardMarkOverlay {
    fill?: BoardMarkFill
    stroke?: BoardMarkStroke
    mixBlendMode?: BoardMarkBlendMode
}

export interface BoardMarksSettings {
    selection: BoardMarkAppearance
    legalMove: BoardMarkAppearance
    cursor: BoardMarkAppearance
}

export const BOARD_MARK_FILL_TYPE_OPTIONS: BoardMarkFillType[] = [
    'none',
    'solid',
    'linear',
    'radial',
]

export const BOARD_MARK_LAYER_OPTIONS: BoardMarkLayer[] = [
    'belowFigures',
    'aboveFigures',
]

export const BOARD_MARK_BLEND_MODE_OPTIONS: BoardMarkBlendMode[] = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
]

export const BOARD_MARK_KIND_OPTIONS: BoardMarkKind[] = [
    'selection',
    'legalMove',
    'cursor',
]
