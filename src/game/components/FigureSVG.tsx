import React, { FC, useId } from 'react'
import { useGameContext } from '../context'
import { FigureId } from '../types/figures'
import { FigureSVGGroup } from './FigureSVGGroup'

export interface FigureSVGProps {
    className?: string
    figureId: FigureId
    size?: number
    highlighted?: boolean
    stateIndex?: number
}

export const FigureSVG: FC<FigureSVGProps> = ({
    className,
    figureId,
    size,
    highlighted,
    stateIndex = 0,
}) => {
    const gradientId = useId().replace(/:/g, '')
    const {
        state: {
            boardParameters: { cellXDistance, cellYDistance },
        },
    } = useGameContext()

    const viewWidth = cellXDistance * 2
    const viewHeight = cellYDistance * 2
    const displayWidth = size ?? viewWidth
    const displayHeight = size ?? viewHeight
    const centerX = viewWidth / 2
    const centerY = viewHeight / 2
    const highlightRadius = Math.min(cellXDistance, cellYDistance) / 2

    return (
        <svg
            className={className}
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            width={displayWidth}
            height={displayHeight}
        >
            {highlighted && (
                <>
                    <defs>
                        <radialGradient id={gradientId}>
                            <stop offset="5%" stopColor="#ff00FF99" />
                            <stop offset="95%" stopColor="#ff000000" />
                        </radialGradient>
                    </defs>
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={highlightRadius}
                        fill={`url(#${gradientId})`}
                    />
                </>
            )}
            <FigureSVGGroup
                figureId={figureId}
                x={centerX}
                y={centerY}
                stateIndex={stateIndex}
            />
        </svg>
    )
}
