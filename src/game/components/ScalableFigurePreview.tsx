import React, { FC, useRef } from 'react'
import cn from 'classnames'
import { useGameContext } from '../context'
import { FigureId } from '../types/figures'
import { useObservedBoardCellSize } from '../figureCellFit'
import { FigureSVG } from './FigureSVG'
import styles from './ScalableFigurePreview.module.css'

export interface ScalableFigurePreviewProps {
    figureId: FigureId
    stateIndex?: number
    highlightSelection?: boolean
    className?: string
    svgClassName?: string
}

export const ScalableFigurePreview: FC<ScalableFigurePreviewProps> = ({
    figureId,
    stateIndex = 0,
    highlightSelection,
    className,
    svgClassName,
}) => {
    const hostRef = useRef<HTMLDivElement>(null)
    const {
        state: {
            boardParameters: { cellXDistance, cellYDistance },
        },
    } = useGameContext()

    const { width, height } = useObservedBoardCellSize(hostRef, cellXDistance, cellYDistance)

    return (
        <div ref={hostRef} className={cn(styles.host, className)}>
            {width > 0 && height > 0 && (
                <FigureSVG
                    className={cn(styles.figureSvg, svgClassName)}
                    figureId={figureId}
                    stateIndex={stateIndex}
                    width={width}
                    height={height}
                    highlightSelection={highlightSelection}
                />
            )}
        </div>
    )
}
