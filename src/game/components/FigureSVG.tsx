import React, { FC, useId, useMemo } from 'react'
import { useGameContext } from '../context'
import { FigureId } from '../types/figures'
import { FigureSVGGroup } from './FigureSVGGroup'
import {
    buildMarkGradientDef,
    DEFAULT_BOARD_MARKS,
    getMarkPaintStyle,
    getOverlayPaintStyle,
    isOverlayVisible,
} from '../boardMarks'
import { BoardMarkAppearance } from '../types/boardMarks'

const FIGURE_PICKER_HIGHLIGHT_SELECTION = DEFAULT_BOARD_MARKS.selection
const FIGURE_PICKER_HIGHLIGHT_CURSOR = DEFAULT_BOARD_MARKS.cursor

export interface FigureSVGProps {
    className?: string
    figureId: FigureId
    size?: number
    width?: number
    height?: number
    highlightSelection?: boolean
    highlightCursor?: boolean
    stateIndex?: number
}

function FigureHighlightMark({
    appearance,
    gradientId,
    cx,
    cy,
    r,
}: {
    appearance: BoardMarkAppearance
    gradientId: string
    cx: number
    cy: number
    r: number
}) {
    const paint = useMemo(
        () => getMarkPaintStyle(appearance, gradientId),
        [appearance, gradientId],
    )

    const overlayPaint = useMemo(
        () => appearance.overlay != null
            ? getOverlayPaintStyle(appearance.overlay)
            : null,
        [appearance],
    )

    return (
        <>
            <defs>
                {buildMarkGradientDef(appearance.fill, gradientId)}
            </defs>
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={paint.fill}
                stroke={paint.stroke}
                strokeWidth={paint.strokeWidth}
                strokeDasharray={paint.strokeDasharray}
                pointerEvents="none"
                style={{ mixBlendMode: 'darken' }}
            />
            {overlayPaint != null && isOverlayVisible(overlayPaint) && (
                <circle
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

export const FigureSVG: FC<FigureSVGProps> = ({
    className,
    figureId,
    size,
    width,
    height,
    highlightSelection,
    highlightCursor,
    stateIndex = 0,
}) => {
    const gradientId = useId().replace(/:/g, '')
    const {
        state: {
            boardParameters: { cellXDistance, cellYDistance },
        },
    } = useGameContext()

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
            <FigureSVGGroup
                figureId={figureId}
                x={centerX}
                y={centerY}
                stateIndex={stateIndex}
            />
            {highlightSelection && (
                <FigureHighlightMark
                    appearance={FIGURE_PICKER_HIGHLIGHT_SELECTION}
                    gradientId={`${gradientId}-selection`}
                    cx={centerX}
                    cy={centerY}
                    r={highlightRadius}
                />
            )}
            {highlightCursor && (
                <FigureHighlightMark
                    appearance={FIGURE_PICKER_HIGHLIGHT_CURSOR}
                    gradientId={`${gradientId}-cursor`}
                    cx={centerX}
                    cy={centerY}
                    r={highlightRadius}
                />
            )}
        </svg>
    )
}
