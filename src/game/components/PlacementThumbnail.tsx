import React, { FC, useMemo } from 'react'
import { useGameContext } from '../context'
import { FiguresSlice } from '../state/slices'
import { CellCoord, iterGridCoords } from '../types/coords'
import { FigureSVGGroup } from './FigureSVGGroup'
import styles from './PlacementThumbnail.module.css'

export interface PlacementThumbnailProps {
    figuresSlice: FiguresSlice
}

export const PlacementThumbnail: FC<PlacementThumbnailProps> = ({ figuresSlice }) => {
    const { state: { boardParameters } } = useGameContext()
    const { n, m, cellXDistance, cellYDistance } = boardParameters

    const boardWidth = cellXDistance * m
    const boardHeight = cellYDistance * n

    // Scale down to fit in thumbnail (200x200 max)
    const maxSize = 200
    const scale = Math.min(1, maxSize / Math.max(boardWidth, boardHeight))
    const thumbnailWidth = boardWidth * scale
    const thumbnailHeight = boardHeight * scale
    const scaledCellX = cellXDistance * scale
    const scaledCellY = cellYDistance * scale

    const figures = useMemo(() => {
        const result: Array<{
            coord: CellCoord
            figureId: string
            isTopOfStack: boolean
        }> = []

        // Add figures from board
        for (const [coordKey, placements] of Object.entries(figuresSlice.figuresByCoord)) {
            if (placements.length === 0) continue

            const parts = coordKey.split(',')
            const i = parseInt(parts[0], 10)
            const j = parseInt(parts[1], 10)

            // Only show the top figure of each stack
            const topPlacement = placements[placements.length - 1]
            result.push({
                coord: { i, j },
                figureId: topPlacement.figureId,
                isTopOfStack: true,
            })
        }

        // Show only first few figures from tray to keep it compact
        figuresSlice.tray.slice(0, 3).forEach((placement, index) => {
            result.push({
                coord: { i: -1 - index, j: 0 }, // Dummy coord for tray figures
                figureId: placement.figureId,
                isTopOfStack: true,
            })
        })

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
                    const x = (item.coord.j + 0.5) * cellXDistance
                    const y = (item.coord.i + 0.5) * cellYDistance

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
