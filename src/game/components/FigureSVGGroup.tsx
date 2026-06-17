import React, { CSSProperties, FC, useId, useMemo } from 'react'
import { useGameContext } from '../context'
import {
    resolveFigureViewParams,
    getFigureSymbol,
    hasFigureImage,
    resolveFigureBorderRadius,
} from '../figureView'
import {
    hasFigureStroke,
    resolveFigureStrokeColor,
    resolveFigureStrokeDasharray,
    resolveFigureStrokeWidth,
} from '../figureStroke'
import {
    isFigureTextShadowEnabled,
    resolveFigureTextShadowBlur,
    resolveFigureTextShadowColor,
    resolveFigureTextShadowOffsetX,
    resolveFigureTextShadowOffsetY,
} from '../figureTextShadow'
import { FigureId } from '../types/figures'
import { useFigureAssetHref } from '../../projects/assets/useFigureAssetHref'
import { useFontAssetFamily } from '../../projects/assets/useFontAssetFamily'
import { useAssetAspectRatio } from '../../projects/assets/useAssetAspectRatio'
import { resolveColorValue, resolveColorValueOrDefault } from '../resolveColorValue'
import { resolveSvgCellPixelSize } from '../cellSvgSize'

export interface FigureSVGGroupProps {
    figureId: FigureId
    x: number
    y: number
    stateIndex?: number
    cellXDistance?: number
    cellYDistance?: number
}

export const FigureSVGGroup: FC<FigureSVGGroupProps> = ({
    figureId,
    x,
    y,
    stateIndex = 0,
    cellXDistance: cellXDistanceProp,
    cellYDistance: cellYDistanceProp,
}) => {
    const filterId = useId().replace(/:/g, '')
    const clipId = useId().replace(/:/g, '')
    const {
        state: {
            boardParameters: { cellXDistance: contextCellX, cellYDistance: contextCellY },
            figureCatalog,
        },
    } = useGameContext()

    const cellXDistance = cellXDistanceProp ?? contextCellX
    const cellYDistance = cellYDistanceProp ?? contextCellY

    const viewParams = useMemo(
        () => resolveFigureViewParams(figureId, figureCatalog, stateIndex),
        [figureId, figureCatalog, stateIndex],
    )

    const imageHref = useFigureAssetHref(hasFigureImage(viewParams) ? viewParams : undefined)
    const aspectRatio = useAssetAspectRatio(imageHref)
    const fontFamily = useFontAssetFamily(viewParams.fontAssetId)
    const textShadowEnabled = isFigureTextShadowEnabled(viewParams)
    const borderRadius = resolveFigureBorderRadius(viewParams)
    const strokeWidth = resolveFigureStrokeWidth(viewParams)
    const strokeEnabled = hasFigureStroke(viewParams)

    const frameSize = resolveSvgCellPixelSize(
        viewParams,
        cellXDistance,
        cellYDistance,
        aspectRatio,
    )

    const frameBounds = {
        x: x - frameSize.width / 2,
        y: y - frameSize.height / 2,
        width: frameSize.width,
        height: frameSize.height,
    }

    const strokeBounds = strokeEnabled
        ? (() => {
            const halfStroke = strokeWidth / 2

            return {
                x: frameBounds.x + halfStroke,
                y: frameBounds.y + halfStroke,
                width: Math.max(0, frameBounds.width - strokeWidth),
                height: Math.max(0, frameBounds.height - strokeWidth),
                rx: Math.max(0, borderRadius - halfStroke),
                ry: Math.max(0, borderRadius - halfStroke),
            }
        })()
        : null

    const textStyle = useMemo(() => ({
        pointerEvents: 'none' as const,
        fontSize: viewParams.fontSize,
        fill: resolveColorValueOrDefault(viewParams.color, '#000'),
        fontFamily: fontFamily || undefined,
        textAnchor: 'middle' as const,
        dominantBaseline: 'middle' as const,
        alignmentBaseline: 'middle' as const,
    }), [viewParams.fontSize, viewParams.color, fontFamily])

    return (
        <g style={{ pointerEvents: 'none' } as CSSProperties}>
            {imageHref && (
                <>
                    {borderRadius > 0 && (
                        <defs>
                            <clipPath id={clipId}>
                                <rect
                                    x={frameBounds.x}
                                    y={frameBounds.y}
                                    width={frameBounds.width}
                                    height={frameBounds.height}
                                    rx={borderRadius}
                                    ry={borderRadius}
                                />
                            </clipPath>
                        </defs>
                    )}
                    <image
                        xlinkHref={imageHref}
                        href={imageHref}
                        width={frameBounds.width}
                        height={frameBounds.height}
                        x={frameBounds.x}
                        y={frameBounds.y}
                        preserveAspectRatio="none"
                        clipPath={borderRadius > 0 ? `url(#${clipId})` : undefined}
                    />
                </>
            )}
            {strokeBounds && (
                <rect
                    x={strokeBounds.x}
                    y={strokeBounds.y}
                    width={strokeBounds.width}
                    height={strokeBounds.height}
                    rx={strokeBounds.rx}
                    ry={strokeBounds.ry}
                    fill="none"
                    stroke={resolveColorValue(resolveFigureStrokeColor(viewParams))}
                    strokeWidth={strokeWidth}
                    strokeDasharray={resolveFigureStrokeDasharray(viewParams)}
                />
            )}
            {textShadowEnabled && (
                <defs>
                    <filter
                        id={filterId}
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feDropShadow
                            dx={resolveFigureTextShadowOffsetX(viewParams)}
                            dy={resolveFigureTextShadowOffsetY(viewParams)}
                            stdDeviation={resolveFigureTextShadowBlur(viewParams)}
                            floodColor={resolveFigureTextShadowColor(viewParams)}
                        />
                    </filter>
                </defs>
            )}
            <text
                x={x}
                y={y}
                filter={textShadowEnabled ? `url(#${filterId})` : undefined}
                style={textStyle as CSSProperties}
            >
                {getFigureSymbol(figureId, viewParams)}
            </text>
        </g>
    )
}
