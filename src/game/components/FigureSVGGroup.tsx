import React, { CSSProperties, FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { resolveFigureViewParams, getFigureSymbol, isFigureImageMode } from '../figureView'
import { FigureId } from '../types/figures'
import { useFigureAssetHref } from '../../projects/assets/useFigureAssetHref'
import { useFontAssetFamily } from '../../projects/assets/useFontAssetFamily'
import { useAssetAspectRatio } from '../../projects/assets/useAssetAspectRatio'
import { resolveSvgCellPixelSize } from '../cellSvgSize'

export interface FigureSVGGroupProps {
    figureId: FigureId
    x: number
    y: number
}

export const FigureSVGGroup: FC<FigureSVGGroupProps> = ({ figureId, x, y }) => {
    const {
        state: {
            boardParameters: { cellXDistance, cellYDistance },
            figureCatalog,
        },
    } = useGameContext()

    const viewParams = useMemo(
        () => resolveFigureViewParams(figureId, figureCatalog),
        [figureId, figureCatalog],
    )

    const imageHref = useFigureAssetHref(isFigureImageMode(viewParams) ? viewParams : undefined)
    const aspectRatio = useAssetAspectRatio(imageHref)
    const fontFamily = useFontAssetFamily(viewParams.fontAssetId)

    const imageSize = isFigureImageMode(viewParams) && imageHref
        ? resolveSvgCellPixelSize(viewParams, cellXDistance, cellYDistance, aspectRatio)
        : null

    const textStyle = useMemo(() => ({
        pointerEvents: 'none' as const,
        fontSize: viewParams.fontSize,
        fill: viewParams.color || '#000',
        fontFamily: fontFamily || undefined,
        textAnchor: 'middle' as const,
        dominantBaseline: 'middle' as const,
        alignmentBaseline: 'middle' as const,
    }), [viewParams.fontSize, viewParams.color, fontFamily])

    if (isFigureImageMode(viewParams) && imageHref && imageSize) {
        return (
            <image
                xlinkHref={imageHref}
                href={imageHref}
                width={imageSize.width}
                height={imageSize.height}
                x={x - imageSize.width / 2}
                y={y - imageSize.height / 2}
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' } as CSSProperties}
            />
        )
    }

    return (
        <text
            x={x}
            y={y}
            style={textStyle as CSSProperties}
        >
            {getFigureSymbol(figureId, viewParams)}
        </text>
    )
}
