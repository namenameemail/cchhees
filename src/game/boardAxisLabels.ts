import {
    AxisLabelAlign,
    AxisLabelFormat,
    AxisLabelGutterAlign,
    AxisLabelSide,
    BoardAxisLabelsSettings,
    BoardAxisSideSettings,
    BoardParameters,
} from './types/boardParameters'

export interface AxisGutters {
    top: number
    bottom: number
    left: number
    right: number
}

export interface AxisLabelTextAttrs {
    x: number
    y: number
    textAnchor: 'start' | 'middle' | 'end'
    dominantBaseline: 'auto' | 'middle' | 'hanging' | 'alphabetic'
}

export interface AxisSideBlockRect {
    x: number
    y: number
    width: number
    height: number
}

export interface AxisSideSpanReference {
    size: number
    origin: number
}

export interface AxisSideBlockRange {
    startCellIndex: number
    cellCount: number
    startOffset: number
    availableSize: number
    spanSize: number
}

function isHorizontalAxisSide(side: AxisLabelSide): boolean {
    return side === 'top' || side === 'bottom'
}

function clampStartCellIndex(blockStartCell: number | undefined, maxCells: number): number {
    if (maxCells <= 0) {
        return 0
    }

    const requested = Math.floor(blockStartCell ?? 1)
    return Math.min(Math.max(requested - 1, 0), maxCells - 1)
}

const ROMAN_NUMERALS: ReadonlyArray<readonly [string, number]> = [
    ['M', 1000],
    ['CM', 900],
    ['D', 500],
    ['CD', 400],
    ['C', 100],
    ['XC', 90],
    ['L', 50],
    ['XL', 40],
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1],
]

const DEFAULT_SIDE_FONT = {
    fontSize: 12,
    color: '#444444',
    fontAssetId: null as number | null,
    offsetX: 0,
    offsetY: 0,
    align: 'center' as AxisLabelAlign,
    gutterAlign: 'center' as AxisLabelGutterAlign,
    blockSpanIncludeGutters: true,
    blockStartCell: 1,
}

function createDefaultSide(
    format: AxisLabelFormat,
    enabled = false,
): BoardAxisSideSettings {
    return {
        enabled,
        format,
        ...DEFAULT_SIDE_FONT,
    }
}

export const DEFAULT_AXIS_LABELS: BoardAxisLabelsSettings = {
    top: createDefaultSide('letter'),
    bottom: createDefaultSide('letter'),
    left: createDefaultSide('digit'),
    right: createDefaultSide('digit'),
}

interface LegacyAxisFontSettings {
    fontSize?: number
    color?: string
    fontAssetId?: number | null
}

function isAxisLabelAlign(value: unknown): value is AxisLabelAlign {
    return value === 'start' || value === 'center' || value === 'end'
}

function isAxisLabelGutterAlign(value: unknown): value is AxisLabelGutterAlign {
    return value === 'inner' || value === 'center' || value === 'outer'
}

function normalizeSide(
    side: BoardAxisSideSettings | undefined,
    fallback: BoardAxisSideSettings,
    legacyFont?: LegacyAxisFontSettings,
): BoardAxisSideSettings {
    const format = side?.format
    const fontSize = side?.fontSize ?? legacyFont?.fontSize

    return {
        enabled: side?.enabled === true,
        format: format === 'digit' || format === 'letter' || format === 'roman'
            ? format
            : fallback.format,
        fontSize: typeof fontSize === 'number' && fontSize > 0
            ? fontSize
            : fallback.fontSize,
        color: side?.color?.trim() || legacyFont?.color?.trim() || fallback.color,
        fontAssetId: typeof side?.fontAssetId === 'number'
            ? side.fontAssetId
            : typeof legacyFont?.fontAssetId === 'number'
                ? legacyFont.fontAssetId
                : null,
        offsetX: typeof side?.offsetX === 'number' ? side.offsetX : fallback.offsetX,
        offsetY: typeof side?.offsetY === 'number' ? side.offsetY : fallback.offsetY,
        align: isAxisLabelAlign(side?.align) ? side.align : fallback.align,
        gutterAlign: isAxisLabelGutterAlign(side?.gutterAlign)
            ? side.gutterAlign
            : fallback.gutterAlign,
        blockWidth: typeof side?.blockWidth === 'number' && side.blockWidth > 0
            ? side.blockWidth
            : undefined,
        blockHeight: typeof side?.blockHeight === 'number' && side.blockHeight > 0
            ? side.blockHeight
            : undefined,
        blockSpanPercent: typeof side?.blockSpanPercent === 'number' && side.blockSpanPercent > 0
            ? side.blockSpanPercent
            : undefined,
        blockSpanIncludeGutters: side?.blockSpanIncludeGutters !== false,
        blockStartCell: typeof side?.blockStartCell === 'number' && side.blockStartCell >= 1
            ? Math.floor(side.blockStartCell)
            : fallback.blockStartCell ?? 1,
        background: side?.background?.trim() || undefined,
        backgroundAssetId: typeof side?.backgroundAssetId === 'number'
            ? side.backgroundAssetId
            : null,
    }
}

export function normalizeAxisLabelsSettings(
    axisLabels?: BoardAxisLabelsSettings,
    legacyShowAxisLabels?: boolean,
): BoardAxisLabelsSettings {
    const legacyFont: LegacyAxisFontSettings | undefined = axisLabels
        ? {
            fontSize: axisLabels.fontSize,
            color: axisLabels.color,
            fontAssetId: axisLabels.fontAssetId,
        }
        : undefined

    const base: BoardAxisLabelsSettings = {
        top: normalizeSide(axisLabels?.top, DEFAULT_AXIS_LABELS.top, legacyFont),
        bottom: normalizeSide(axisLabels?.bottom, DEFAULT_AXIS_LABELS.bottom, legacyFont),
        left: normalizeSide(axisLabels?.left, DEFAULT_AXIS_LABELS.left, legacyFont),
        right: normalizeSide(axisLabels?.right, DEFAULT_AXIS_LABELS.right, legacyFont),
    }

    if (axisLabels) {
        return base
    }

    if (legacyShowAxisLabels === true) {
        return {
            ...base,
            top: { ...base.top, enabled: true },
            left: { ...base.left, enabled: true },
        }
    }

    return base
}

export function resolveAxisLabelsSettings(parameters: BoardParameters): BoardAxisLabelsSettings {
    return normalizeAxisLabelsSettings(parameters.axisLabels, parameters.showAxisLabels)
}

export function isAnyAxisSideEnabled(settings: BoardAxisLabelsSettings): boolean {
    return settings.top.enabled
        || settings.bottom.enabled
        || settings.left.enabled
        || settings.right.enabled
}

export function formatColumnLabel(columnIndex: number): string {
    let index = columnIndex
    let label = ''

    while (index >= 0) {
        label = String.fromCharCode(97 + (index % 26)) + label
        index = Math.floor(index / 26) - 1
    }

    return label
}

export function formatRoman(value: number): string {
    if (value <= 0) {
        return String(value)
    }

    let remaining = value
    let result = ''

    for (const [symbol, weight] of ROMAN_NUMERALS) {
        while (remaining >= weight) {
            result += symbol
            remaining -= weight
        }
    }

    return result
}

export function formatAxisLabel(index: number, format: AxisLabelFormat): string {
    switch (format) {
        case 'letter':
            return formatColumnLabel(index)
        case 'roman':
            return formatRoman(index + 1)
        case 'digit':
        default:
            return String(index + 1)
    }
}

function estimateLabelSpan(text: string, fontSize: number): number {
    return Math.max(fontSize + 6, text.length * fontSize * 0.62 + 8)
}

const CELL_ALIGN_PADDING = 4
const GUTTER_EDGE_PADDING = 4

function getGutterBandPosition(
    side: AxisLabelSide,
    gutterSize: number,
    gutterAlign: AxisLabelGutterAlign,
    fontSize: number,
    contentOffset: number,
): number {
    const innerPadding = GUTTER_EDGE_PADDING + fontSize * 0.35
    const outerPadding = GUTTER_EDGE_PADDING + fontSize * 0.35

    switch (side) {
        case 'top':
            switch (gutterAlign) {
                case 'inner':
                    return contentOffset - innerPadding
                case 'outer':
                    return outerPadding
                case 'center':
                default:
                    return gutterSize / 2
            }
        case 'bottom':
            switch (gutterAlign) {
                case 'inner':
                    return contentOffset + innerPadding
                case 'outer':
                    return contentOffset + gutterSize - outerPadding
                case 'center':
                default:
                    return contentOffset + gutterSize / 2
            }
        case 'left':
            switch (gutterAlign) {
                case 'inner':
                    return contentOffset - innerPadding
                case 'outer':
                    return outerPadding
                case 'center':
                default:
                    return gutterSize / 2
            }
        case 'right':
            switch (gutterAlign) {
                case 'inner':
                    return contentOffset + innerPadding
                case 'outer':
                    return contentOffset + gutterSize - outerPadding
                case 'center':
                default:
                    return contentOffset + gutterSize / 2
            }
        default:
            return gutterSize / 2
    }
}

export function getAxisSideLabelTextAttrs(
    side: AxisLabelSide,
    index: number,
    parameters: BoardParameters,
    gutters: AxisGutters,
    contentSize: { width: number; height: number },
    sideSettings: BoardAxisSideSettings,
): AxisLabelTextAttrs {
    const {
        cellXDistance,
        cellYDistance,
    } = parameters
    const fontSize = getAxisSideFontSize(parameters, sideSettings)
    const align = sideSettings.align ?? 'center'
    const gutterAlign = sideSettings.gutterAlign ?? 'center'
    const offsetX = sideSettings.offsetX ?? 0
    const offsetY = sideSettings.offsetY ?? 0
    const cellPadding = Math.max(CELL_ALIGN_PADDING, fontSize * 0.2)

    if (side === 'top' || side === 'bottom') {
        const cellLeft = gutters.left + index * cellXDistance
        const cellRight = cellLeft + cellXDistance
        const contentOffset = side === 'top'
            ? gutters.top
            : gutters.top + contentSize.height

        let x = cellLeft + cellXDistance / 2
        let textAnchor: AxisLabelTextAttrs['textAnchor'] = 'middle'

        if (align === 'start') {
            x = cellLeft + cellPadding
            textAnchor = 'start'
        } else if (align === 'end') {
            x = cellRight - cellPadding
            textAnchor = 'end'
        }

        return {
            x: x + offsetX,
            y: getGutterBandPosition(side, side === 'top' ? gutters.top : gutters.bottom, gutterAlign, fontSize, contentOffset) + offsetY,
            textAnchor,
            dominantBaseline: 'middle',
        }
    }

    const cellTop = gutters.top + index * cellYDistance
    const cellBottom = cellTop + cellYDistance
    const contentOffset = side === 'left'
        ? gutters.left
        : gutters.left + contentSize.width

    let y = cellTop + cellYDistance / 2
    let dominantBaseline: AxisLabelTextAttrs['dominantBaseline'] = 'middle'

    if (align === 'start') {
        y = cellTop + cellPadding
        dominantBaseline = 'hanging'
    } else if (align === 'end') {
        y = cellBottom - cellPadding
        dominantBaseline = 'alphabetic'
    }

    return {
        x: getGutterBandPosition(side, side === 'left' ? gutters.left : gutters.right, gutterAlign, fontSize, contentOffset) + offsetX,
        y: y + offsetY,
        textAnchor: 'middle',
        dominantBaseline,
    }
}

function getWidestColumnLabel(n: number, format: AxisLabelFormat): string {
    if (n <= 0) {
        return ''
    }

    let widest = formatAxisLabel(0, format)

    for (let index = 1; index < n; index += 1) {
        const candidate = formatAxisLabel(index, format)
        if (candidate.length > widest.length) {
            widest = candidate
        }
    }

    return widest
}

function getWidestRowLabel(m: number, format: AxisLabelFormat): string {
    return getWidestColumnLabel(m, format)
}

export function getAxisSideFontSize(
    parameters: BoardParameters,
    sideSettings: BoardAxisSideSettings,
): number {
    if (typeof sideSettings.fontSize === 'number' && sideSettings.fontSize > 0) {
        return sideSettings.fontSize
    }

    return Math.max(
        9,
        Math.min(13, parameters.cellXDistance * 0.28, parameters.cellYDistance * 0.28),
    )
}

/** @deprecated use getAxisSideFontSize */
export function getAxisLabelFontSize(parameters: BoardParameters): number {
    const settings = resolveAxisLabelsSettings(parameters)

    return getAxisSideFontSize(parameters, settings.top)
}

export function getAxisLabelGutters(parameters: BoardParameters): AxisGutters {
    const settings = resolveAxisLabelsSettings(parameters)

    if (!isAnyAxisSideEnabled(settings)) {
        return { top: 0, bottom: 0, left: 0, right: 0 }
    }

    const topLabel = settings.top.enabled
        ? getWidestColumnLabel(parameters.n, settings.top.format)
        : ''
    const bottomLabel = settings.bottom.enabled
        ? getWidestColumnLabel(parameters.n, settings.bottom.format)
        : ''
    const leftLabel = settings.left.enabled
        ? getWidestRowLabel(parameters.m, settings.left.format)
        : ''
    const rightLabel = settings.right.enabled
        ? getWidestRowLabel(parameters.m, settings.right.format)
        : ''

    const topFontSize = getAxisSideFontSize(parameters, settings.top)
    const bottomFontSize = getAxisSideFontSize(parameters, settings.bottom)
    const leftFontSize = getAxisSideFontSize(parameters, settings.left)
    const rightFontSize = getAxisSideFontSize(parameters, settings.right)

    return {
        top: settings.top.enabled
            ? Math.max(
                18,
                estimateLabelSpan(topLabel, topFontSize) + Math.abs(settings.top.offsetY ?? 0),
                settings.top.blockHeight ?? 0,
            )
            : 0,
        bottom: settings.bottom.enabled
            ? Math.max(
                18,
                estimateLabelSpan(bottomLabel, bottomFontSize) + Math.abs(settings.bottom.offsetY ?? 0),
                settings.bottom.blockHeight ?? 0,
            )
            : 0,
        left: settings.left.enabled
            ? Math.max(
                20,
                estimateLabelSpan(leftLabel, leftFontSize) + Math.abs(settings.left.offsetX ?? 0),
                settings.left.blockWidth ?? 0,
            )
            : 0,
        right: settings.right.enabled
            ? Math.max(
                20,
                estimateLabelSpan(rightLabel, rightFontSize) + Math.abs(settings.right.offsetX ?? 0),
                settings.right.blockWidth ?? 0,
            )
            : 0,
    }
}

export function getAxisSideSpanReference(
    side: AxisLabelSide,
    gutters: AxisGutters,
    contentSize: { width: number; height: number },
    includeGutters: boolean,
): AxisSideSpanReference {
    const boardWidth = gutters.left + contentSize.width + gutters.right
    const boardHeight = gutters.top + contentSize.height + gutters.bottom

    if (side === 'top' || side === 'bottom') {
        return {
            size: includeGutters ? boardWidth : contentSize.width,
            origin: includeGutters ? 0 : gutters.left,
        }
    }

    return {
        size: includeGutters ? boardHeight : contentSize.height,
        origin: includeGutters ? 0 : gutters.top,
    }
}

function resolveBlockSpanPercent(
    side: AxisLabelSide,
    sideSettings: BoardAxisSideSettings,
    spanReference: AxisSideSpanReference,
): number {
    if (typeof sideSettings.blockSpanPercent === 'number' && sideSettings.blockSpanPercent > 0) {
        return sideSettings.blockSpanPercent
    }

    if (
        (side === 'top' || side === 'bottom')
        && typeof sideSettings.blockWidth === 'number'
        && sideSettings.blockWidth > 0
        && spanReference.size > 0
    ) {
        return (sideSettings.blockWidth / spanReference.size) * 100
    }

    if (
        (side === 'left' || side === 'right')
        && typeof sideSettings.blockHeight === 'number'
        && sideSettings.blockHeight > 0
        && spanReference.size > 0
    ) {
        return (sideSettings.blockHeight / spanReference.size) * 100
    }

    return 100
}

export function getAxisSideBlockRange(
    side: AxisLabelSide,
    boardParameters: BoardParameters,
    gutters: AxisGutters,
    contentSize: { width: number; height: number },
    sideSettings: BoardAxisSideSettings,
): AxisSideBlockRange | null {
    if (!sideSettings.enabled) {
        return null
    }

    const horizontal = isHorizontalAxisSide(side)
    const maxCells = horizontal ? boardParameters.n : boardParameters.m

    if (!maxCells) {
        return null
    }

    const includeGutters = sideSettings.blockSpanIncludeGutters !== false
    const spanReference = getAxisSideSpanReference(side, gutters, contentSize, includeGutters)
    const spanPercent = resolveBlockSpanPercent(side, sideSettings, spanReference)
    const startCellIndex = clampStartCellIndex(sideSettings.blockStartCell, maxCells)
    const cellDistance = horizontal ? boardParameters.cellXDistance : boardParameters.cellYDistance
    const contentStart = horizontal ? gutters.left : gutters.top
    const absoluteStart = contentStart + startCellIndex * cellDistance
    const startOffset = absoluteStart - spanReference.origin
    const availableSize = Math.max(0, spanReference.size - startOffset)
    const spanSize = availableSize * spanPercent / 100
    const maxCellCount = maxCells - startCellIndex
    const cellCount = maxCellCount > 0
        ? Math.min(maxCellCount, Math.max(1, Math.round(spanSize / cellDistance)))
        : 0

    return {
        startCellIndex,
        cellCount,
        startOffset,
        availableSize,
        spanSize,
    }
}

export function getAxisSideBlockRect(
    side: AxisLabelSide,
    boardParameters: BoardParameters,
    gutters: AxisGutters,
    contentSize: { width: number; height: number },
    sideSettings: BoardAxisSideSettings,
): AxisSideBlockRect | null {
    if (!sideSettings.enabled) {
        return null
    }

    const spanReference = getAxisSideSpanReference(
        side,
        gutters,
        contentSize,
        sideSettings.blockSpanIncludeGutters !== false,
    )
    const blockRange = getAxisSideBlockRange(
        side,
        boardParameters,
        gutters,
        contentSize,
        sideSettings,
    )

    if (!blockRange || blockRange.spanSize <= 0) {
        return null
    }

    const spanSize = blockRange.spanSize

    switch (side) {
        case 'top': {
            const height = gutters.top

            return {
                x: spanReference.origin + blockRange.startOffset,
                y: 0,
                width: spanSize,
                height,
            }
        }
        case 'bottom': {
            const height = gutters.bottom

            return {
                x: spanReference.origin + blockRange.startOffset,
                y: gutters.top + contentSize.height,
                width: spanSize,
                height,
            }
        }
        case 'left': {
            const width = gutters.left

            return {
                x: 0,
                y: spanReference.origin + blockRange.startOffset,
                width,
                height: spanSize,
            }
        }
        case 'right': {
            const width = gutters.right

            return {
                x: gutters.left + contentSize.width,
                y: spanReference.origin + blockRange.startOffset,
                width,
                height: spanSize,
            }
        }
        default:
            return null
    }
}

export function hasAxisSideBlockBackground(sideSettings: BoardAxisSideSettings): boolean {
    return Boolean(sideSettings.background?.trim() || sideSettings.backgroundAssetId != null)
}

export function getBoardContentSize(parameters: BoardParameters): { width: number; height: number } {
    return {
        width: parameters.n * parameters.cellXDistance,
        height: parameters.m * parameters.cellYDistance,
    }
}

export function getBoardPixelSize(parameters: BoardParameters): { width: number; height: number } {
    const gutters = getAxisLabelGutters(parameters)
    const content = getBoardContentSize(parameters)

    return {
        width: gutters.left + content.width + gutters.right,
        height: gutters.top + content.height + gutters.bottom,
    }
}

export function normalizeBoardParameters(parameters: BoardParameters): BoardParameters {
    const axisLabels = normalizeAxisLabelsSettings(parameters.axisLabels, parameters.showAxisLabels)
    const { showAxisLabels: _legacy, ...rest } = parameters

    return {
        ...rest,
        axisLabels,
    }
}

export function getAxisSideAssetIds(settings: BoardAxisLabelsSettings): number[] {
    const ids: number[] = []
    const sides: AxisLabelSide[] = ['top', 'bottom', 'left', 'right']

    for (const side of sides) {
        for (const assetId of [settings[side].fontAssetId, settings[side].backgroundAssetId]) {
            if (typeof assetId === 'number' && !ids.includes(assetId)) {
                ids.push(assetId)
            }
        }
    }

    return ids
}

/** @deprecated use getAxisSideAssetIds */
export function getAxisSideFontAssetIds(settings: BoardAxisLabelsSettings): number[] {
    return getAxisSideAssetIds(settings)
}
