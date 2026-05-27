import React, { CSSProperties, FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { CellParameters, CellShape } from '../types/cells'
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
    const aspectRatio = useAssetAspectRatio(shape === CellShape.svg ? imageHref : undefined)

    const svgPixelSize = shape === CellShape.svg
        ? resolveSvgCellPixelSize(
            { width: rawWidth, height: rawHeight, ...shapeParams },
            cellXDistance,
            cellYDistance,
            aspectRatio,
        )
        : null

    const width = svgPixelSize?.width ?? rawWidth ?? 0
    const height = svgPixelSize?.height ?? rawHeight ?? 0


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
            {shape === CellShape.svg && imageHref && (
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
