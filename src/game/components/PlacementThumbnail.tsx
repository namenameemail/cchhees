import React, { FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { FiguresSlice } from '../state/slices'
import { CellCoord } from '../types/coords'
import { FigureSVGGroup } from './FigureSVGGroup'
import styles from './PlacementThumbnail.module.css'

export interface PlacementThumbnailProps {
    figuresSlice: FiguresSlice
}

export const PlacementThumbnail: FC<PlacementThumbnailProps> = ({ figuresSlice }) => {
    const { state: { boardParameters } } = useGameContext()
    const { n, m, cellXDistance, cellYDistance } = boardParameters

    const boardWidth = cellXDistance * n
    const boardHeight = cellYDistance * m

    const maxSize = 200
    const scale = Math.min(1, maxSize / Math.max(boardWidth, boardHeight))
    const thumbnailWidth = boardWidth * scale
    const thumbnailHeight = boardHeight * scale

    const figures = useMemo(() => {
        const result: Array<{
            coord: CellCoord
            figureId: string
        }> = []

        for (const [coordKey, placements] of Object.entries(figuresSlice.figuresByCoord)) {
            if (placements.length === 0) continue

            const parts = coordKey.split(',')
            const i = parseInt(parts[0], 10)
            const j = parseInt(parts[1], 10)

            const topPlacement = placements[placements.length - 1]
            result.push({
                coord: { i, j },
                figureId: topPlacement.figureId,
            })
        }

        return result
    }, [figuresSlice])

    return (
        <svg
            className={styles.thumbnail}
            viewBox={`0 0 ${boardWidth} ${boardHeight}`}
            width={thumbnailWidth}
            height={thumbnailHeight}
            overflow="visible"
        >
            <g style={{ pointerEvents: 'none' }}>
                {figures.map((item) => {
                    const x = (item.coord.i + 0.5) * cellXDistance
                    const y = (item.coord.j + 0.5) * cellYDistance

                    return (
                        <FigureSVGGroup
                            key={`${item.coord.i},${item.coord.j}`}
                            figureId={item.figureId}
                            x={x}
                            y={y}
                            cellXDistance={cellXDistance}
                            cellYDistance={cellYDistance}
                        />
                    )
                })}
            </g>
        </svg>
    )
}
