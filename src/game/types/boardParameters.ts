export enum BoardBackgroundImageFit {
    tile = 'tile',
    center = 'center',
    fitWidth = 'fitWidth',
    fitHeight = 'fitHeight',
    repeat = 'repeat',
}

export type AxisLabelFormat = 'digit' | 'letter' | 'roman'

export type AxisLabelSide = 'top' | 'bottom' | 'left' | 'right'

export type AxisLabelAlign = 'start' | 'center' | 'end'

export type AxisLabelGutterAlign = 'inner' | 'center' | 'outer'

export interface BoardAxisSideSettings {
    enabled: boolean
    format: AxisLabelFormat
    fontSize?: number
    color?: string
    fontAssetId?: number | null
    offsetX?: number
    offsetY?: number
    align?: AxisLabelAlign
    gutterAlign?: AxisLabelGutterAlign
    /** top/bottom: strip thickness in px */
    blockHeight?: number
    /** left/right: strip thickness in px */
    blockWidth?: number
    /** Span along the strip as percent of reference size */
    blockSpanPercent?: number
    /** If true, 100% = full board SVG; if false, 100% = cell grid only */
    blockSpanIncludeGutters?: boolean
    /** 1-based first cell along the strip (column for top/bottom, row for left/right) */
    blockStartCell?: number
    background?: string
    backgroundAssetId?: number | null
}

export interface BoardAxisLabelsSettings {
    top: BoardAxisSideSettings
    bottom: BoardAxisSideSettings
    left: BoardAxisSideSettings
    right: BoardAxisSideSettings
    /** @deprecated migrated to per-side settings */
    fontSize?: number
    /** @deprecated migrated to per-side settings */
    color?: string
    /** @deprecated migrated to per-side settings */
    fontAssetId?: number | null
}

export interface BoardParameters {
    n: number
    m: number
    cellWidth: number
    cellHeight: number
    cellXDistance: number
    cellYDistance: number
    swapOnEat: boolean
    background?: string
    backgroundAssetId?: number | null
    backgroundImageFit?: BoardBackgroundImageFit
    backgroundRepeatWidth?: number
    backgroundRepeatHeight?: number
    backgroundRepeatOffsetX?: number
    backgroundRepeatOffsetY?: number
    borderRadius?: number
    borderWidth?: number
    borderColor?: string
    borderDasharray?: string
    /** @deprecated migrated to axisLabels */
    showAxisLabels?: boolean
    axisLabels?: BoardAxisLabelsSettings
}

export const AXIS_LABEL_FORMAT_OPTIONS: AxisLabelFormat[] = ['digit', 'letter', 'roman']

export const AXIS_LABEL_ALIGN_OPTIONS: AxisLabelAlign[] = ['start', 'center', 'end']

export const AXIS_LABEL_GUTTER_ALIGN_OPTIONS: AxisLabelGutterAlign[] = ['inner', 'center', 'outer']

export const AXIS_LABEL_ALIGN_LABELS: Record<AxisLabelAlign, string> = {
    start: 'начало',
    center: 'центр',
    end: 'конец',
}

export const AXIS_LABEL_GUTTER_ALIGN_LABELS: Record<AxisLabelGutterAlign, string> = {
    inner: 'к доске',
    center: 'центр',
    outer: 'от доски',
}

export const AXIS_LABEL_SIDE_OPTIONS: AxisLabelSide[] = ['top', 'bottom', 'left', 'right']

export const AXIS_LABEL_SIDE_LABELS: Record<AxisLabelSide, string> = {
    top: 'сверху (столбцы)',
    bottom: 'снизу (столбцы)',
    left: 'слева (строки)',
    right: 'справа (строки)',
}
