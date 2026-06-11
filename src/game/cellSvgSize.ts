export const DEFAULT_SVG_CELL_WIDTH_PERCENT = 100
export const DEFAULT_SVG_CELL_HEIGHT_PERCENT = 100

export interface SvgCellSizeParams {
    width?: number
    height?: number
    manualWidth?: boolean
    manualHeight?: boolean
}

export function isSvgManualWidth(params?: SvgCellSizeParams): boolean {
    return params?.manualWidth !== false
}

export function isSvgManualHeight(params?: SvgCellSizeParams): boolean {
    return params?.manualHeight !== false
}

export function normalizeSvgCellParams<T extends SvgCellSizeParams>(params: T): T {
    const manualWidth = isSvgManualWidth(params)
    let manualHeight = isSvgManualHeight(params)

    if (!manualWidth && !manualHeight) {
        manualHeight = true
    }

    if (manualWidth === params.manualWidth && manualHeight === params.manualHeight) {
        return params
    }

    return {
        ...params,
        manualWidth,
        manualHeight,
    }
}

export function resolveSvgCellPixelSize(
    params: SvgCellSizeParams,
    cellXDistance: number,
    cellYDistance: number,
    aspectRatio: number,
): { width: number; height: number } {
    const normalized = normalizeSvgCellParams(params)
    const safeAspectRatio = aspectRatio > 0 ? aspectRatio : 1

    let widthPx = ((normalized.width ?? DEFAULT_SVG_CELL_WIDTH_PERCENT) / 100) * cellXDistance
    let heightPx = ((normalized.height ?? DEFAULT_SVG_CELL_HEIGHT_PERCENT) / 100) * cellYDistance

    if (isSvgManualWidth(normalized) && isSvgManualHeight(normalized)) {
        return { width: widthPx, height: heightPx }
    }

    if (isSvgManualWidth(normalized) && !isSvgManualHeight(normalized)) {
        heightPx = widthPx / safeAspectRatio
        return { width: widthPx, height: heightPx }
    }

    if (!isSvgManualWidth(normalized) && isSvgManualHeight(normalized)) {
        widthPx = heightPx * safeAspectRatio
        return { width: widthPx, height: heightPx }
    }

    return { width: widthPx, height: heightPx }
}

export function getDefaultSvgCellParams() {
    return {
        width: DEFAULT_SVG_CELL_WIDTH_PERCENT,
        height: DEFAULT_SVG_CELL_HEIGHT_PERCENT,
        manualWidth: true,
        manualHeight: true,
    }
}
