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
}

export const FigureSVGGroup: FC<FigureSVGGroupProps> = ({ figureId, x, y, stateIndex = 0 }) => {
    const filterId = useId().replace(/:/g, '')
    const clipId = useId().replace(/:/g, '')
    const {
        state: {
            boardParameters: { cellXDistance, cellYDistance },
            figureCatalog,
        },
    } = useGameContext()

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

    const imageSize = hasFigureImage(viewParams) && imageHref
        ? resolveSvgCellPixelSize(viewParams, cellXDistance, cellYDistance, aspectRatio)
        : null

    const imageBounds = imageSize
        ? {
            x: x - imageSize.width / 2,
            y: y - imageSize.height / 2,
            width: imageSize.width,
            height: imageSize.height,
        }
        : null

    const strokeBounds = imageBounds && strokeEnabled
        ? (() => {
            const halfStroke = strokeWidth / 2

            return {
                x: imageBounds.x + halfStroke,
                y: imageBounds.y + halfStroke,
                width: Math.max(0, imageBounds.width - strokeWidth),
                height: Math.max(0, imageBounds.height - strokeWidth),
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
            {imageHref && imageBounds && (
                <>
                    {borderRadius > 0 && (
                        <defs>
                            <clipPath id={clipId}>
                                <rect
                                    x={imageBounds.x}
                                    y={imageBounds.y}
                                    width={imageBounds.width}
                                    height={imageBounds.height}
                                    rx={borderRadius}
                                    ry={borderRadius}
                                />
                            </clipPath>
                        </defs>
                    )}
                    <image
                        xlinkHref={imageHref}
                        href={imageHref}
                        width={imageBounds.width}
                        height={imageBounds.height}
                        x={imageBounds.x}
                        y={imageBounds.y}
                        preserveAspectRatio="none"
                        clipPath={borderRadius > 0 ? `url(#${clipId})` : undefined}
                    />
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
                </>
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
