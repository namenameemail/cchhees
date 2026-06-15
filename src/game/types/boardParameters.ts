import { BoardMarksSettings } from './boardMarks'

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

export type AxisNumberingOrientation = 'horizontal' | 'vertical'

export type AxisNumberingEdge = AxisLabelSide

export type AxisNumberingOrder = 'forward' | 'reverse'

export type AxisNumberingFormat = AxisLabelFormat

export interface BoardSurfaceAppearance {
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
}

export interface BoardAxisNumberingFrameSettings extends BoardSurfaceAppearance {
    /** обрезать общий фон и полосы нумерации по borderRadius рамки */
    clipNumberingToBorderRadius?: boolean
}

export interface BoardAxisNumbering {
    orientation: AxisNumberingOrientation
    edge: AxisNumberingEdge
    order: AxisNumberingOrder
    format: AxisNumberingFormat
    skipCellsStart: number
    skipCellsEnd: number
    numberOffset: number
    /** смещение полосы от внешнего края внутрь доски, в клетках */
    edgeInsetCells?: number
    fontSize?: number
    color?: string
    fontAssetId?: number | null
    offsetX?: number
    offsetY?: number
    align?: AxisLabelAlign
    gutterAlign?: AxisLabelGutterAlign
    stripSize?: number
    background?: string
    backgroundAssetId?: number | null
}

/** @deprecated migrated to axisNumberings */
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
    blockHeight?: number
    blockWidth?: number
    blockSpanPercent?: number
    blockSpanIncludeGutters?: boolean
    blockStartCell?: number
    background?: string
    backgroundAssetId?: number | null
}

/** @deprecated migrated to axisNumberings */
export interface BoardAxisLabelsSettings {
    top: BoardAxisSideSettings
    bottom: BoardAxisSideSettings
    left: BoardAxisSideSettings
    right: BoardAxisSideSettings
    fontSize?: number
    color?: string
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
    boardMarks?: BoardMarksSettings
    axisNumberings?: BoardAxisNumbering[]
    /** общий фон полосы нумерации (вокруг доски) */
    axisNumberingFrame?: BoardAxisNumberingFrameSettings
    /** @deprecated migrated to axisNumberings */
    showAxisLabels?: boolean
    /** @deprecated migrated to axisNumberings */
    axisLabels?: BoardAxisLabelsSettings
}

export const AXIS_NUMBERING_FORMAT_OPTIONS: AxisNumberingFormat[] = ['digit', 'letter', 'roman']

export const AXIS_NUMBERING_ORIENTATION_OPTIONS: AxisNumberingOrientation[] = ['horizontal', 'vertical']

export const AXIS_NUMBERING_ORDER_OPTIONS: AxisNumberingOrder[] = ['forward', 'reverse']

export const AXIS_NUMBERING_HORIZONTAL_EDGE_OPTIONS: AxisNumberingEdge[] = ['top', 'bottom']

export const AXIS_NUMBERING_VERTICAL_EDGE_OPTIONS: AxisNumberingEdge[] = ['left', 'right']

export const AXIS_NUMBERING_ORIENTATION_LABELS: Record<AxisNumberingOrientation, string> = {
    horizontal: 'горизонтальная',
    vertical: 'вертикальная',
}

export const AXIS_NUMBERING_ORDER_LABELS: Record<AxisNumberingOrder, string> = {
    forward: 'прямой',
    reverse: 'обратный',
}

export const AXIS_NUMBERING_FORMAT_LABELS: Record<AxisNumberingFormat, string> = {
    digit: 'арабские',
    letter: 'буквы',
    roman: 'римские',
}

export const AXIS_NUMBERING_EDGE_LABELS: Record<AxisNumberingEdge, string> = {
    top: 'сверху',
    bottom: 'снизу',
    left: 'слева',
    right: 'справа',
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
