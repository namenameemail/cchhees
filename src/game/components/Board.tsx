import React, { forwardRef, useMemo } from 'react'
import { useGameContext } from '../context'
import { BoardCell } from './BoardCell'
import { getConnections } from '../context/connections'
import { ConnectionSVGGroup } from './ConnectionSVGGroup'
import { CellSVGGroup } from './CellSVGGroup'
import { coordKey, iterGridCoords } from '../types/coords'
import {
    buildStyleRuleDrawPlan,
    findConnectionDataByKey,
} from '../styleRules/evaluate'
import { isCellStyleRule, isConnectionStyleRule } from '../types/styleRules'

export interface BoardProps {
    className?: string
}

export const Board = forwardRef<SVGSVGElement, BoardProps>(function Board({ className }, ref) {

    const { state } = useGameContext()

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

    return (
        <svg ref={ref} style={boardStyle} className={className}>
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
                    <BoardCell key={coordKey(coord)} cell={cells[index]} coord={coord}/>
                )
            })}
        </svg>
    )
})
