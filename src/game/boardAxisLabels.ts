import {
    AxisLabelAlign,
    AxisLabelFormat,
    AxisLabelGutterAlign,
    AxisLabelSide,
    AxisNumberingEdge,
    AxisNumberingFormat,
    AxisNumberingOrder,
    AxisNumberingOrientation,
    BoardAxisLabelsSettings,
    BoardAxisNumbering,
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

export interface AxisNumberingCellRange {
    startIndex: number
    endIndex: number
    cellCount: number
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

const DEFAULT_NUMBERING_STYLE = {
    fontSize: 12,
    color: '#444444',
    fontAssetId: null as number | null,
    offsetX: 0,
    offsetY: 0,
    align: 'center' as AxisLabelAlign,
    gutterAlign: 'center' as AxisLabelGutterAlign,
    skipCellsStart: 0,
    skipCellsEnd: 0,
    numberOffset: 0,
    edgeInsetCells: 0,
}

export function createDefaultAxisNumbering(): BoardAxisNumbering {
    return {
        orientation: 'horizontal',
        edge: 'top',
        order: 'forward',
        format: 'letter',
        ...DEFAULT_NUMBERING_STYLE,
    }
}

function isAxisLabelAlign(value: unknown): value is AxisLabelAlign {
    return value === 'start' || value === 'center' || value === 'end'
}

function isAxisLabelGutterAlign(value: unknown): value is AxisLabelGutterAlign {
    return value === 'inner' || value === 'center' || value === 'outer'
}

function isAxisNumberingOrientation(value: unknown): value is AxisNumberingOrientation {
    return value === 'horizontal' || value === 'vertical'
}

function isAxisNumberingOrder(value: unknown): value is AxisNumberingOrder {
    return value === 'forward' || value === 'reverse'
}

function isAxisNumberingFormat(value: unknown): value is AxisNumberingFormat {
    return value === 'digit' || value === 'letter' || value === 'roman'
}

function normalizeEdgeForOrientation(
    orientation: AxisNumberingOrientation,
    edge: AxisNumberingEdge | undefined,
): AxisNumberingEdge {
    if (orientation === 'horizontal') {
        return edge === 'bottom' ? 'bottom' : 'top'
    }

    return edge === 'right' ? 'right' : 'left'
}

export function normalizeAxisNumbering(item: BoardAxisNumbering | undefined): BoardAxisNumbering {
    const fallback = createDefaultAxisNumbering()
    const orientation = isAxisNumberingOrientation(item?.orientation)
        ? item.orientation
        : fallback.orientation

    return {
        orientation,
        edge: normalizeEdgeForOrientation(orientation, item?.edge),
        order: isAxisNumberingOrder(item?.order) ? item.order : fallback.order,
        format: isAxisNumberingFormat(item?.format) ? item.format : fallback.format,
        skipCellsStart: typeof item?.skipCellsStart === 'number' && item.skipCellsStart >= 0
            ? Math.floor(item.skipCellsStart)
            : fallback.skipCellsStart,
        skipCellsEnd: typeof item?.skipCellsEnd === 'number' && item.skipCellsEnd >= 0
            ? Math.floor(item.skipCellsEnd)
            : fallback.skipCellsEnd,
        numberOffset: typeof item?.numberOffset === 'number' ? item.numberOffset : fallback.numberOffset,
        edgeInsetCells: typeof item?.edgeInsetCells === 'number' && item.edgeInsetCells >= 0
            ? Math.floor(item.edgeInsetCells)
            : fallback.edgeInsetCells,
        fontSize: typeof item?.fontSize === 'number' && item.fontSize > 0
            ? item.fontSize
            : fallback.fontSize,
        color: item?.color?.trim() || fallback.color,
        fontAssetId: typeof item?.fontAssetId === 'number' ? item.fontAssetId : null,
        offsetX: typeof item?.offsetX === 'number' ? item.offsetX : fallback.offsetX,
        offsetY: typeof item?.offsetY === 'number' ? item.offsetY : fallback.offsetY,
        align: isAxisLabelAlign(item?.align) ? item.align : fallback.align,
        gutterAlign: isAxisLabelGutterAlign(item?.gutterAlign)
            ? item.gutterAlign
            : fallback.gutterAlign,
        stripSize: typeof item?.stripSize === 'number' && item.stripSize > 0
            ? item.stripSize
            : undefined,
        background: item?.background?.trim() || undefined,
        backgroundAssetId: typeof item?.backgroundAssetId === 'number'
            ? item.backgroundAssetId
            : null,
    }
}

export function isHorizontalNumbering(item: BoardAxisNumbering): boolean {
    return item.orientation === 'horizontal'
}

export function getAxisNumberingAxisLength(
    item: BoardAxisNumbering,
    n: number,
    m: number,
): number {
    return isHorizontalNumbering(item) ? n : m
}

/** Max skip leaving at least one cell when the opposite skip is fixed. */
export function getAxisNumberingMaxSkip(
    item: BoardAxisNumbering,
    oppositeSkip: number,
    n: number,
    m: number,
): number {
    const axisLength = getAxisNumberingAxisLength(item, n, m)

    if (axisLength <= 0) {
        return 0
    }

    const opposite = Math.max(0, Math.floor(oppositeSkip))

    return Math.max(0, axisLength - 1 - opposite)
}

export function clampAxisNumberingSkips(
    item: BoardAxisNumbering,
    n: number,
    m: number,
): BoardAxisNumbering {
    const axisLength = getAxisNumberingAxisLength(item, n, m)

    if (axisLength <= 0) {
        return { ...item, skipCellsStart: 0, skipCellsEnd: 0 }
    }

    let skipStart = Math.max(0, Math.floor(item.skipCellsStart))
    let skipEnd = Math.max(0, Math.floor(item.skipCellsEnd))
    const maxSum = axisLength - 1

    skipStart = Math.min(skipStart, maxSum)
    skipEnd = Math.min(skipEnd, maxSum)

    if (skipStart + skipEnd > maxSum) {
        skipEnd = Math.min(skipEnd, maxSum - skipStart)
        skipStart = Math.min(skipStart, maxSum - skipEnd)
    }

    return { ...item, skipCellsStart: skipStart, skipCellsEnd: skipEnd }
}

export function getAxisNumberingMaxEdgeInset(
    item: BoardAxisNumbering,
    n: number,
    m: number,
): number {
    return isHorizontalNumbering(item) ? m : n
}

export function getAxisNumberingEdgeInsetCells(item: BoardAxisNumbering): number {
    return Math.max(0, Math.floor(item.edgeInsetCells ?? 0))
}

/** Линия привязки полосы к границе row/col N (внутренняя грань полосы). */
export function getAxisNumberingStripAnchorLine(
    item: BoardAxisNumbering,
    parameters: BoardParameters,
    gutters: AxisGutters,
): number {
    const inset = getAxisNumberingEdgeInsetCells(item)
    const { n, m, cellXDistance, cellYDistance } = parameters

    switch (item.edge) {
        case 'top':
            return gutters.top + inset * cellYDistance
        case 'bottom':
            return gutters.top + (m - inset) * cellYDistance
        case 'left':
            return gutters.left + inset * cellXDistance
        case 'right':
            return gutters.left + (n - inset) * cellXDistance
    }
}

export function getAxisNumberingStripOrigin(
    item: BoardAxisNumbering,
    parameters: BoardParameters,
    gutters: AxisGutters,
    stripThickness: number,
): { x: number; y: number } {
    const anchor = getAxisNumberingStripAnchorLine(item, parameters, gutters)

    switch (item.edge) {
        case 'top':
            return { x: 0, y: anchor - stripThickness }
        case 'bottom':
            return { x: 0, y: anchor }
        case 'left':
            return { x: anchor - stripThickness, y: 0 }
        case 'right':
            return { x: anchor, y: 0 }
    }
}

export function hasAxisNumberingBoardOverlap(numberings: BoardAxisNumbering[]): boolean {
    return numberings.some(item => getAxisNumberingEdgeInsetCells(item) > 0)
}

export function clampAxisNumberingEdgeInset(
    item: BoardAxisNumbering,
    n: number,
    m: number,
): BoardAxisNumbering {
    const maxInset = getAxisNumberingMaxEdgeInset(item, n, m)
    const inset = Math.min(getAxisNumberingEdgeInsetCells(item), maxInset)

    return { ...item, edgeInsetCells: inset }
}

export function normalizeAxisNumberingForBoard(
    item: BoardAxisNumbering | undefined,
    n: number,
    m: number,
): BoardAxisNumbering {
    return clampAxisNumberingEdgeInset(
        clampAxisNumberingSkips(normalizeAxisNumbering(item), n, m),
        n,
        m,
    )
}

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

function createDefaultSide(format: AxisLabelFormat, enabled = false): BoardAxisSideSettings {
    return { enabled, format, ...DEFAULT_SIDE_FONT }
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
        fontSize: typeof fontSize === 'number' && fontSize > 0 ? fontSize : fallback.fontSize,
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
        blockWidth: typeof side?.blockWidth === 'number' && side.blockWidth > 0 ? side.blockWidth : undefined,
        blockHeight: typeof side?.blockHeight === 'number' && side.blockHeight > 0 ? side.blockHeight : undefined,
        blockSpanPercent: typeof side?.blockSpanPercent === 'number' && side.blockSpanPercent > 0
            ? side.blockSpanPercent
            : undefined,
        blockSpanIncludeGutters: side?.blockSpanIncludeGutters !== false,
        blockStartCell: typeof side?.blockStartCell === 'number' && side.blockStartCell >= 1
            ? Math.floor(side.blockStartCell)
            : fallback.blockStartCell ?? 1,
        background: side?.background?.trim() || undefined,
        backgroundAssetId: typeof side?.backgroundAssetId === 'number' ? side.backgroundAssetId : null,
    }
}

function normalizeAxisLabelsSettings(
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

function legacySideToNumbering(
    side: AxisLabelSide,
    settings: BoardAxisSideSettings,
    n: number,
    m: number,
): BoardAxisNumbering | null {
    if (!settings.enabled) {
        return null
    }

    const horizontal = side === 'top' || side === 'bottom'
    const maxCells = horizontal ? n : m
    const skipStart = Math.max(0, (settings.blockStartCell ?? 1) - 1)
    let skipEnd = 0

    if (
        typeof settings.blockSpanPercent === 'number'
        && settings.blockSpanPercent > 0
        && settings.blockSpanPercent < 100
        && maxCells > skipStart
    ) {
        const rangeCells = maxCells - skipStart
        const covered = Math.round(rangeCells * settings.blockSpanPercent / 100)
        skipEnd = Math.max(0, maxCells - skipStart - covered)
    }

    return normalizeAxisNumbering({
        orientation: horizontal ? 'horizontal' : 'vertical',
        edge: side,
        order: 'forward',
        format: settings.format,
        skipCellsStart: skipStart,
        skipCellsEnd: skipEnd,
        numberOffset: 0,
        fontSize: settings.fontSize,
        color: settings.color,
        fontAssetId: settings.fontAssetId,
        offsetX: settings.offsetX,
        offsetY: settings.offsetY,
        align: settings.align,
        gutterAlign: settings.gutterAlign,
        stripSize: horizontal ? settings.blockHeight : settings.blockWidth,
        background: settings.background,
        backgroundAssetId: settings.backgroundAssetId,
    })
}

export function migrateLegacyAxisLabels(parameters: BoardParameters): BoardAxisNumbering[] {
    const legacy = normalizeAxisLabelsSettings(parameters.axisLabels, parameters.showAxisLabels)
    const sides: AxisLabelSide[] = ['top', 'bottom', 'left', 'right']

    return sides
        .map(side => legacySideToNumbering(side, legacy[side], parameters.n, parameters.m))
        .filter((item): item is BoardAxisNumbering => item != null)
}

export function resolveAxisNumberings(parameters: BoardParameters): BoardAxisNumbering[] {
    const { n, m } = parameters

    if (parameters.axisNumberings && parameters.axisNumberings.length > 0) {
        return parameters.axisNumberings.map(item => normalizeAxisNumberingForBoard(item, n, m))
    }

    return migrateLegacyAxisLabels(parameters)
        .map(item => normalizeAxisNumberingForBoard(item, n, m))
}

/** @deprecated use resolveAxisNumberings */
export function resolveAxisLabelsSettings(parameters: BoardParameters): BoardAxisLabelsSettings {
    return normalizeAxisLabelsSettings(parameters.axisLabels, parameters.showAxisLabels)
}

export function isAnyAxisNumberingEnabled(numberings: BoardAxisNumbering[]): boolean {
    return numberings.length > 0
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

export function getAxisNumberingCellRange(
    item: BoardAxisNumbering,
    n: number,
    m: number,
): AxisNumberingCellRange | null {
    const maxCells = getAxisNumberingAxisLength(item, n, m)

    if (maxCells <= 0) {
        return null
    }

    const skipStart = Math.min(Math.max(0, item.skipCellsStart), maxCells - 1)
    const skipEnd = Math.min(Math.max(0, item.skipCellsEnd), maxCells - 1)
    const startIndex = skipStart
    const endIndex = maxCells - 1 - skipEnd

    if (startIndex > endIndex) {
        return null
    }

    return {
        startIndex,
        endIndex,
        cellCount: endIndex - startIndex + 1,
    }
}

export function formatAxisNumberingLabel(
    item: BoardAxisNumbering,
    cellIndex: number,
    range: AxisNumberingCellRange,
): string {
    const seqPos = cellIndex - range.startIndex
    const seqIndex = item.order === 'reverse'
        ? range.cellCount - 1 - seqPos
        : seqPos

    if (item.format === 'letter') {
        const letterIndex = item.order === 'reverse'
            ? range.endIndex - seqPos
            : cellIndex

        return formatColumnLabel(letterIndex + item.numberOffset)
    }

    return formatAxisLabel(seqIndex + item.numberOffset, item.format)
}

function estimateLabelSpan(text: string, fontSize: number): number {
    return Math.max(fontSize + 6, text.length * fontSize * 0.62 + 8)
}

const CELL_ALIGN_PADDING = 4
const GUTTER_EDGE_PADDING = 4

function getAxisNumberingStripBandPosition(
    side: AxisLabelSide,
    stripThickness: number,
    gutterAlign: AxisLabelGutterAlign,
    fontSize: number,
    anchorLine: number,
): number {
    const innerPadding = GUTTER_EDGE_PADDING + fontSize * 0.35
    const outerPadding = GUTTER_EDGE_PADDING + fontSize * 0.35

    switch (side) {
        case 'top': {
            const stripStart = anchorLine - stripThickness
            switch (gutterAlign) {
                case 'inner':
                    return anchorLine - innerPadding
                case 'outer':
                    return stripStart + outerPadding
                case 'center':
                default:
                    return stripStart + stripThickness / 2
            }
        }
        case 'bottom': {
            const stripEnd = anchorLine + stripThickness
            switch (gutterAlign) {
                case 'inner':
                    return anchorLine + innerPadding
                case 'outer':
                    return stripEnd - outerPadding
                case 'center':
                default:
                    return anchorLine + stripThickness / 2
            }
        }
        case 'left': {
            const stripStart = anchorLine - stripThickness
            switch (gutterAlign) {
                case 'inner':
                    return anchorLine - innerPadding
                case 'outer':
                    return stripStart + outerPadding
                case 'center':
                default:
                    return stripStart + stripThickness / 2
            }
        }
        case 'right': {
            const stripEnd = anchorLine + stripThickness
            switch (gutterAlign) {
                case 'inner':
                    return anchorLine + innerPadding
                case 'outer':
                    return stripEnd - outerPadding
                case 'center':
                default:
                    return anchorLine + stripThickness / 2
            }
        }
        default:
            return anchorLine
    }
}

export function getAxisNumberingFontSize(
    parameters: BoardParameters,
    item: BoardAxisNumbering,
): number {
    if (typeof item.fontSize === 'number' && item.fontSize > 0) {
        return item.fontSize
    }

    return Math.max(
        9,
        Math.min(13, parameters.cellXDistance * 0.28, parameters.cellYDistance * 0.28),
    )
}

export function getAxisNumberingLabelTextAttrs(
    item: BoardAxisNumbering,
    cellIndex: number,
    parameters: BoardParameters,
    gutters: AxisGutters,
    contentSize: { width: number; height: number },
): AxisLabelTextAttrs {
    const { cellXDistance, cellYDistance } = parameters
    const side = item.edge
    const fontSize = getAxisNumberingFontSize(parameters, item)
    const align = item.align ?? 'center'
    const gutterAlign = item.gutterAlign ?? 'center'
    const offsetX = item.offsetX ?? 0
    const offsetY = item.offsetY ?? 0
    const cellPadding = Math.max(CELL_ALIGN_PADDING, fontSize * 0.2)
    const range = getAxisNumberingCellRange(item, parameters.n, parameters.m)
    const stripThickness = range
        ? getAxisNumberingGutterContribution(item, parameters, range)
        : 0
    const anchorLine = getAxisNumberingStripAnchorLine(item, parameters, gutters)

    if (side === 'top' || side === 'bottom') {
        const cellLeft = gutters.left + cellIndex * cellXDistance
        const cellRight = cellLeft + cellXDistance

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
            y: getAxisNumberingStripBandPosition(
                side,
                stripThickness,
                gutterAlign,
                fontSize,
                anchorLine,
            ) + offsetY,
            textAnchor,
            dominantBaseline: 'middle',
        }
    }

    const cellTop = gutters.top + cellIndex * cellYDistance
    const cellBottom = cellTop + cellYDistance

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
        x: getAxisNumberingStripBandPosition(
            side,
            stripThickness,
            gutterAlign,
            fontSize,
            anchorLine,
        ) + offsetX,
        y: y + offsetY,
        textAnchor: 'middle',
        dominantBaseline,
    }
}

function getWidestLabelInRange(
    item: BoardAxisNumbering,
    range: AxisNumberingCellRange,
): string {
    let widest = ''

    for (let index = range.startIndex; index <= range.endIndex; index += 1) {
        const candidate = formatAxisNumberingLabel(item, index, range)
        if (candidate.length > widest.length) {
            widest = candidate
        }
    }

    return widest
}

function getAxisNumberingGutterContribution(
    item: BoardAxisNumbering,
    parameters: BoardParameters,
    range: AxisNumberingCellRange,
): number {
    const fontSize = getAxisNumberingFontSize(parameters, item)
    const widest = getWidestLabelInRange(item, range)
    const perpendicularOffset = isHorizontalNumbering(item)
        ? Math.abs(item.offsetY ?? 0)
        : Math.abs(item.offsetX ?? 0)
    const baseMin = isHorizontalNumbering(item) ? 18 : 20

    return Math.max(
        baseMin,
        estimateLabelSpan(widest, fontSize) + perpendicularOffset,
        item.stripSize ?? 0,
    )
}

function getAxisNumberingExternalGutterContribution(
    item: BoardAxisNumbering,
    parameters: BoardParameters,
    range: AxisNumberingCellRange,
): number {
    const thickness = getAxisNumberingGutterContribution(item, parameters, range)
    const insetPx = getAxisNumberingEdgeInsetCells(item) * (
        isHorizontalNumbering(item)
            ? parameters.cellYDistance
            : parameters.cellXDistance
    )

    return Math.max(0, thickness - insetPx)
}

export function getAxisLabelGutters(parameters: BoardParameters): AxisGutters {
    const numberings = resolveAxisNumberings(parameters)
    const gutters: AxisGutters = { top: 0, bottom: 0, left: 0, right: 0 }

    for (const item of numberings) {
        const range = getAxisNumberingCellRange(item, parameters.n, parameters.m)
        if (!range) {
            continue
        }

        const thickness = getAxisNumberingExternalGutterContribution(item, parameters, range)
        gutters[item.edge] = Math.max(gutters[item.edge], thickness)
    }

    return gutters
}

export function getAxisNumberingBlockRect(
    item: BoardAxisNumbering,
    parameters: BoardParameters,
    gutters: AxisGutters,
    contentSize: { width: number; height: number },
): AxisSideBlockRect | null {
    const range = getAxisNumberingCellRange(item, parameters.n, parameters.m)
    if (!range) {
        return null
    }

    const { cellXDistance, cellYDistance } = parameters
    const stripThickness = getAxisNumberingGutterContribution(item, parameters, range)
    const origin = getAxisNumberingStripOrigin(item, parameters, gutters, stripThickness)

    if (isHorizontalNumbering(item)) {
        const width = range.cellCount * cellXDistance
        const x = gutters.left + range.startIndex * cellXDistance

        return {
            x,
            y: origin.y,
            width,
            height: stripThickness,
        }
    }

    const height = range.cellCount * cellYDistance
    const y = gutters.top + range.startIndex * cellYDistance

    return {
        x: origin.x,
        y,
        width: stripThickness,
        height,
    }
}

export function hasAxisNumberingBlockBackground(item: BoardAxisNumbering): boolean {
    return Boolean(item.background?.trim() || item.backgroundAssetId != null)
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
    const axisNumberings = resolveAxisNumberings(parameters)
    const { showAxisLabels: _show, axisLabels: _labels, ...rest } = parameters

    return {
        ...rest,
        axisNumberings,
    }
}

export function getAxisNumberingFrameAssetIds(
    frame: BoardParameters['axisNumberingFrame'],
): number[] {
    if (frame?.backgroundAssetId == null) {
        return []
    }

    return [frame.backgroundAssetId]
}

export function getAxisNumberingAssetIds(numberings: BoardAxisNumbering[]): number[] {
    const ids: number[] = []

    for (const item of numberings) {
        for (const assetId of [item.fontAssetId, item.backgroundAssetId]) {
            if (typeof assetId === 'number' && !ids.includes(assetId)) {
                ids.push(assetId)
            }
        }
    }

    return ids
}

/** @deprecated use getAxisNumberingAssetIds */
export function getAxisSideAssetIds(settings: BoardAxisLabelsSettings): number[] {
    const sides: AxisLabelSide[] = ['top', 'bottom', 'left', 'right']
    const ids: number[] = []

    for (const side of sides) {
        for (const assetId of [settings[side].fontAssetId, settings[side].backgroundAssetId]) {
            if (typeof assetId === 'number' && !ids.includes(assetId)) {
                ids.push(assetId)
            }
        }
    }

    return ids
}

/** @deprecated use getAxisNumberingAssetIds */
export function getAxisSideFontAssetIds(settings: BoardAxisLabelsSettings): number[] {
    return getAxisSideAssetIds(settings)
}
