import React, { CSSProperties, FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { CellParameters, CellShape } from '../types/cells'
import { isCellImageShape } from '../cellImageShape'
import { useAssetHref } from '../../projects/assets/useAssetHref'
import { useAssetAspectRatio } from '../../projects/assets/useAssetAspectRatio'
import { resolveSvgCellPixelSize } from '../cellSvgSize'

export interface CellSVGGroupProps {
    cellParams: CellParameters
    x: number
    y: number
}


export const CellSVGGroup: FC<CellSVGGroupProps> = (props) => {
    const {
        boardParameters: {
            cellXDistance,
            cellYDistance,
        },
    } = useGameContext().state

    const {
        cellParams,
        x, y,
    } = props

    const {
        shape,
        paramsByShape,
    } = cellParams || {}

    const {
        colour,
        width: rawWidth,
        height: rawHeight,
        strokeWidth,
        strokeColor,
        strokeDasharray,
        ...shapeParams
    } = paramsByShape?.[shape as string] || {}

    const imageHref = useAssetHref(cellParams)
    const aspectRatio = useAssetAspectRatio(isCellImageShape(shape) ? imageHref : undefined)

    const imagePixelSize = isCellImageShape(shape)
        ? resolveSvgCellPixelSize(
            { width: rawWidth, height: rawHeight, ...shapeParams },
            cellXDistance,
            cellYDistance,
            aspectRatio,
        )
        : null

    const width = imagePixelSize?.width ?? rawWidth ?? 0
    const height = imagePixelSize?.height ?? rawHeight ?? 0


    const cellStyle = useMemo(() => ({
        fill: colour,
        strokeWidth,
        stroke: strokeColor,
        strokeDasharray,
        pointerEvents: 'none',
    }), [colour, strokeWidth, strokeColor, strokeDasharray])

    const doubleDistX = cellXDistance * 2
    const doubleDistY = cellYDistance * 2
    return (
        <g width={doubleDistX} height={doubleDistY}>
            {shape === CellShape.circle && (
                <ellipse
                    cx={x}
                    cy={y}
                    rx={width / 2}
                    ry={height / 2}
                    style={cellStyle as CSSProperties}
                />
            )}
            {shape === CellShape.rect && (
                <rect
                    x={x - width / 2}
                    y={y - height / 2}
                    width={width}
                    height={height}
                    style={cellStyle as CSSProperties}
                />
            )}
            {isCellImageShape(shape) && imageHref && (
                <image
                    xlinkHref={imageHref}
                    href={imageHref}
                    width={width}
                    height={height}
                    x={x - width / 2}
                    y={y - height / 2}
                    preserveAspectRatio="none"
                />
            )}
        </g>
    )
}
