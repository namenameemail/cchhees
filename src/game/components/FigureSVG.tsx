import React, { FC, useId, useMemo } from 'react'
import { useGameContext } from '../context'
import { FigureId } from '../types/figures'
import { FigureSVGGroup } from './FigureSVGGroup'
import { buildMarkGradientDef, DEFAULT_BOARD_MARKS, getMarkPaintStyle, getOverlayPaintStyle, isOverlayVisible } from '../boardMarks'

const FIGURE_PICKER_HIGHLIGHT = DEFAULT_BOARD_MARKS.selection

export interface FigureSVGProps {
    className?: string
    figureId: FigureId
    size?: number
    width?: number
    height?: number
    highlighted?: boolean
    stateIndex?: number
}

export const FigureSVG: FC<FigureSVGProps> = ({
    className,
    figureId,
    size,
    width,
    height,
    highlighted,
    stateIndex = 0,
}) => {
    const gradientId = useId().replace(/:/g, '')
    const {
        state: {
            boardParameters: { cellXDistance, cellYDistance },
        },
    } = useGameContext()

    const highlightPaint = useMemo(
        () => getMarkPaintStyle(FIGURE_PICKER_HIGHLIGHT, gradientId),
        [gradientId],
    )

    const overlayPaint = useMemo(
        () => FIGURE_PICKER_HIGHLIGHT.overlay != null
            ? getOverlayPaintStyle(FIGURE_PICKER_HIGHLIGHT.overlay)
            : null,
        [],
    )

    const useCellViewBox = width != null && height != null

    const viewWidth = useCellViewBox ? cellXDistance : cellXDistance * 2
    const viewHeight = useCellViewBox ? cellYDistance : cellYDistance * 2
    const displayWidth = width ?? size ?? cellXDistance * 2
    const displayHeight = height ?? size ?? cellYDistance * 2
    const centerX = viewWidth / 2
    const centerY = viewHeight / 2
    const highlightRadius = Math.min(cellXDistance, cellYDistance) / 2

    return (
        <svg
            className={className}
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            width={displayWidth}
            height={displayHeight}
            overflow="visible"
        >
            {highlighted && (
                <defs>
                    {buildMarkGradientDef(FIGURE_PICKER_HIGHLIGHT.fill, gradientId)}
                </defs>
            )}
            <FigureSVGGroup
                figureId={figureId}
                x={centerX}
                y={centerY}
                stateIndex={stateIndex}
            />
            {highlighted && (
                <>
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={highlightRadius}
                        fill={highlightPaint.fill}
                        stroke={highlightPaint.stroke}
                        strokeWidth={highlightPaint.strokeWidth}
                        strokeDasharray={highlightPaint.strokeDasharray}
                        pointerEvents="none"
                        style={{ mixBlendMode: 'darken' }}
                    />
                    {overlayPaint != null && isOverlayVisible(overlayPaint) && (
                        <circle
                            cx={centerX}
                            cy={centerY}
                            r={highlightRadius}
                            fill={overlayPaint.fill}
                            stroke={overlayPaint.stroke}
                            strokeWidth={overlayPaint.strokeWidth}
                            strokeDasharray={overlayPaint.strokeDasharray}
                            pointerEvents="none"
                            style={{ mixBlendMode: overlayPaint.mixBlendMode as React.CSSProperties['mixBlendMode'] }}
                        />
                    )}
                </>
            )}
        </svg>
    )
}
