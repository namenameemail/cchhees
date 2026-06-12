import React, { forwardRef, useId, useMemo } from 'react'
import { useGameContext } from '../context'
import { BoardCell } from './BoardCell'
import { getConnections } from '../context/connections'
import { ConnectionSVGGroup } from './ConnectionSVGGroup'
import { CellSVGGroup } from './CellSVGGroup'
import { coordKey, iterGridCoords, coordToIndex, indexToCoord } from '../types/coords'
import { FigureId } from '../types/figures'
import {
    buildStyleRuleDrawPlan,
    findConnectionDataByKey,
} from '../styleRules/evaluate'
import { isCellStyleRule, isConnectionStyleRule } from '../types/styleRules'
import { Mode } from '../types'
import { resolveFigureDefinition } from '../figureView'
import { getLegalMoveDestinations } from '../moveRules'

export interface BoardProps {
    className?: string
}

export const Board = forwardRef<SVGSVGElement, BoardProps>(function Board({ className }, ref) {

    const { state, mode, activeCell, figureCatalog } = useGameContext()
    const selectionGradientId = useId().replace(/:/g, '')
    const legalMoveGradientId = useId().replace(/:/g, '')

    const {
        boardParameters: {
            n,
            m,
            cellHeight,
            cellWidth,
            cellXDistance,
            cellYDistance,
        },
        styleRules,
        cells,
    } = state

    const connections = useMemo(() => {
        return (n && m) ? getConnections(n, m) : {}
    }, [n, m])

    const boardStyle = useMemo(() => ({
        width: n * cellXDistance,
        height: m * cellYDistance,
    }), [n, m, cellHeight, cellWidth, cellXDistance, cellYDistance])

    const drawPlan = useMemo(() => {
        if (!n || !m) {
            return { cellLayers: new Map(), connectionLayers: new Map() }
        }

        return buildStyleRuleDrawPlan(styleRules, n, m)
    }, [styleRules, n, m])

    const legalMoveKeys = useMemo(() => {
        if (mode !== Mode.Game || activeCell === undefined) {
            return new Set<string>()
        }

        const cellIndex = coordToIndex(activeCell, n)
        const figureId = state.cells[cellIndex]?.figure

        if (!figureId) {
            return new Set<string>()
        }

        const definition = resolveFigureDefinition(figureId, figureCatalog ?? state.figureCatalog)

        const figuresByCoord: Record<string, FigureId> = {}
        for (const [index, cell] of state.cells.entries()) {
            if (cell.figure) {
                figuresByCoord[coordKey(indexToCoord(index, n))] = cell.figure
            }
        }

        return new Set(
            getLegalMoveDestinations(
                activeCell,
                definition,
                figuresByCoord,
                state.boardParameters,
            ).map(coordKey),
        )
    }, [mode, activeCell, state.cells, state.tray, state.boardParameters, n, figureCatalog, state.figureCatalog])

    return (
        <svg ref={ref} style={boardStyle} className={className}>
            <defs>
                <radialGradient id={selectionGradientId}>
                    <stop offset="5%" stopColor="#ff00FF99" />
                    <stop offset="95%" stopColor="#ff000000" />
                </radialGradient>
                <radialGradient id={legalMoveGradientId}>
                    <stop offset="5%" stopColor="#00aa4455" />
                    <stop offset="95%" stopColor="#00aa4400" />
                </radialGradient>
            </defs>
            {styleRules.map((rule, ruleIndex) => (
                <g key={ruleIndex}>
                    {isCellStyleRule(rule) && drawPlan.cellLayers.get(ruleIndex)?.map((coord) => (
                        <CellSVGGroup
                            key={coordKey(coord)}
                            x={coord.i * cellXDistance + cellXDistance / 2}
                            y={coord.j * cellYDistance + cellYDistance / 2}
                            cellParams={rule.cellParams}
                        />
                    ))}
                    {isConnectionStyleRule(rule) && drawPlan.connectionLayers.get(ruleIndex)?.map((connectionKey) => {
                        const data = findConnectionDataByKey(connections, connectionKey)

                        if (!data) {
                            return null
                        }

                        const xFrom = data.iFrom * cellXDistance + cellXDistance / 2
                        const yFrom = data.jFrom * cellYDistance + cellYDistance / 2
                        const xTo = data.iTo * cellXDistance + cellXDistance / 2
                        const yTo = data.jTo * cellYDistance + cellYDistance / 2

                        return (
                            <ConnectionSVGGroup
                                key={connectionKey}
                                x1={xFrom}
                                y1={yFrom}
                                x2={xTo}
                                y2={yTo}
                                connectionParams={rule.connectionParams}
                            />
                        )
                    })}
                </g>
            ))}
            {iterGridCoords(n, m).map((coord) => {
                const index = coord.j * n + coord.i
                return (
                    <BoardCell
                        key={coordKey(coord)}
                        cell={cells[index]}
                        coord={coord}
                        selectionGradientId={selectionGradientId}
                        legalMoveGradientId={legalMoveGradientId}
                        isLegalMove={legalMoveKeys.has(coordKey(coord))}
                    />
                )
            })}
        </svg>
    )
})
