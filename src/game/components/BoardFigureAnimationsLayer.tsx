import React, { FC, useEffect, useState } from 'react'
import { FigureOverlayAnimItem } from '../figureAnimation/playStepAnimation'
import { FigureSVGGroup } from './FigureSVGGroup'
import styles from './BoardFigureAnimationsLayer.module.css'

export interface BoardFigureAnimationsLayerProps {
    items: FigureOverlayAnimItem[]
    cellXDistance?: number
    cellYDistance?: number
}

interface AnimatedFigureProps {
    item: FigureOverlayAnimItem
    cellXDistance?: number
    cellYDistance?: number
}

const AnimatedFigure: FC<AnimatedFigureProps> = ({ item, cellXDistance, cellYDistance }) => {
    const [active, setActive] = useState(false)
    const maxDurationMs = Math.max(
        item.transformDurationMs,
        item.opacityDelayMs + item.opacityDurationMs,
    )

    useEffect(() => {
        if (maxDurationMs <= 0) {
            return
        }

        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => setActive(true))
        })

        return () => cancelAnimationFrame(frame)
    }, [maxDurationMs, item.id])

    const transform = active
        ? `translate(${item.toX}px, ${item.toY}px)`
        : `translate(${item.fromX}px, ${item.fromY}px)`

    const opacity = item.kind === 'remove' && active ? 0 : 1

    return (
        <g
            className={styles.animGroup}
            style={{
                transform,
                opacity,
                transitionDuration: `${item.transformDurationMs}ms, ${item.opacityDurationMs}ms`,
                transitionDelay: `0ms, ${item.opacityDelayMs}ms`,
            }}
        >
            <FigureSVGGroup
                figureId={item.figureId}
                stateIndex={item.stateIndex}
                x={0}
                y={0}
                cellXDistance={cellXDistance}
                cellYDistance={cellYDistance}
            />
        </g>
    )
}

export const BoardFigureAnimationsLayer: FC<BoardFigureAnimationsLayerProps> = ({
    items,
    cellXDistance,
    cellYDistance,
}) => {
    if (items.length === 0) {
        return null
    }

    return (
        <g className={styles.layer} pointerEvents="none">
            {items.map(item => (
                <AnimatedFigure
                    key={item.id}
                    item={item}
                    cellXDistance={cellXDistance}
                    cellYDistance={cellYDistance}
                />
            ))}
        </g>
    )
}
