import type { CSSProperties } from 'react'

export const PANEL_Z_INDEX = 10000
export const VIEWPORT_PADDING = 4

export function clampPanelLeft(left: number, panelWidth: number): number {
    const maxLeft = window.innerWidth - panelWidth - VIEWPORT_PADDING

    return Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft))
}

export function clampPanelTop(top: number, panelHeight: number): number {
    const maxTop = window.innerHeight - panelHeight - VIEWPORT_PADDING

    return Math.max(VIEWPORT_PADDING, Math.min(top, maxTop))
}

export function computeStatesPanelFixedStyle(
    tileRect: DOMRect,
    previewSize: number,
    stateCount: number,
): CSSProperties {
    const panelWidth = previewSize
    const panelHeight = stateCount * previewSize

    const fitsOnRight = tileRect.right + panelWidth <= window.innerWidth - VIEWPORT_PADDING
    const rawLeft = fitsOnRight
        ? tileRect.right
        : tileRect.left - panelWidth

    return {
        position: 'fixed',
        left: clampPanelLeft(rawLeft, panelWidth),
        top: clampPanelTop(tileRect.top, panelHeight),
        width: previewSize,
        minHeight: tileRect.height,
        zIndex: PANEL_Z_INDEX + 1,
    }
}
