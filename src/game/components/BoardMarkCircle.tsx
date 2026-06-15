import React, { FC, useMemo } from 'react'
import { BoardMarkAppearance, BoardMarkKind } from '../types/boardMarks'
import { getMarkPaintStyle, getOverlayPaintStyle, isOverlayVisible } from '../boardMarks'

export interface BoardMarkCircleProps {
    kind: BoardMarkKind
    appearance: BoardMarkAppearance
    gradientId?: string
    overlayGradientId?: string
    cx: number
    cy: number
    r: number
    visible: boolean
}

export const BoardMarkCircle: FC<BoardMarkCircleProps> = ({
    kind,
    appearance,
    gradientId,
    overlayGradientId,
    cx,
    cy,
    r,
    visible,
}) => {
    const paint = useMemo(
        () => getMarkPaintStyle(appearance, gradientId),
        [appearance, gradientId],
    )

    const overlayPaint = useMemo(
        () => appearance.overlay != null
            ? getOverlayPaintStyle(appearance.overlay, overlayGradientId)
            : null,
        [appearance.overlay, overlayGradientId],
    )

    if (!visible) {
        return null
    }

    const hasFill = paint.fill !== 'transparent'
    const hasStroke = paint.stroke !== 'none' && paint.strokeWidth > 0
    const showMain = hasFill || hasStroke
    const showOverlay = overlayPaint != null && isOverlayVisible(overlayPaint)

    if (!showMain && !showOverlay) {
        return null
    }

    return (
        <>
            {showMain && (
                <circle
                    data-board-mark={kind}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={paint.fill}
                    stroke={paint.stroke}
                    strokeWidth={paint.strokeWidth}
                    strokeDasharray={paint.strokeDasharray}
                    pointerEvents="none"
                    style={{ mixBlendMode: paint.mixBlendMode as React.CSSProperties['mixBlendMode'] }}
                />
            )}
            {showOverlay && overlayPaint && (
                <circle
                    data-board-mark={kind}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={overlayPaint.fill}
                    stroke={overlayPaint.stroke}
                    strokeWidth={overlayPaint.strokeWidth}
                    strokeDasharray={overlayPaint.strokeDasharray}
                    pointerEvents="none"
                    style={{ mixBlendMode: overlayPaint.mixBlendMode as React.CSSProperties['mixBlendMode'] }}
                />
            )}
        </>
    )
}
