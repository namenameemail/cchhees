import React, { FC, useCallback, useMemo } from 'react'
import { useGameContext } from '../context'
import { BoardCell } from './BoardCell'
import { CellParameters } from '../types/cells'
import { getConditionFunctionByType } from '../context/conditions'
import { ConnectionParams } from '../types/connections'
import { ConnectionData, getConnectionConditionFunctionByType, getConnections } from '../context/connections'
import { ConnectionSVGGroup } from './ConnectionSVGGroup'
import { coordKey, iterGridCoords } from '../types/coords'

export interface BoardProps {
    className?: string
}

export const Board: FC<BoardProps> = ({ className }) => {

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
        connectionsConditions,
        cells,
    } = state

    const connections = useMemo(() => {
        return (n && m) ? getConnections(n, m) : {}
    }, [n, m])

    const boardStyle = useMemo(() => ({
        width: n * cellXDistance,
        height: m * cellYDistance,
    }), [n, m, cellHeight, cellWidth, cellXDistance, cellYDistance])

    const connectionParams = useCallback((connectionData: ConnectionData) => {
        return connectionsConditions.reduce<ConnectionParams>((res, { connectionConditions, connectionParams }) => {
            const isTrue = connectionConditions.reduce<boolean>((res, connectionCondition) => (
                res
                && getConnectionConditionFunctionByType[connectionCondition.type]
                    ?.(connectionCondition.paramsByType?.[connectionCondition.type], n)
                    ?.(connectionData)
            ), true)

            return isTrue ? connectionParams : res
        }, {})

    }, [connectionsConditions, n])

    return (
        <svg style={boardStyle} className={className}>

            {Object.keys(connections).map((fromKey) => {
                const [iFrom, jFrom] = fromKey.split(',').map(Number)

                const xFrom = iFrom * cellXDistance + cellXDistance / 2
                const yFrom = jFrom * cellYDistance + cellYDistance / 2

                return Object.keys(connections[fromKey]).map((toKey) => {
                    const data = connections[fromKey][toKey]

                    if (!data) return null

                    const [iTo, jTo] = toKey.split(',').map(Number)

                    const xTo = iTo * cellXDistance + cellXDistance / 2
                    const yTo = jTo * cellYDistance + cellYDistance / 2

                    const params = connectionParams(data)
                    return (
                        <ConnectionSVGGroup key={`${fromKey}-${toKey}`} x1={xFrom} y1={yFrom} x2={xTo} y2={yTo} connectionParams={params}/>
                    )
                })
            })}
            {iterGridCoords(n, m).map((coord) => {
                const index = coord.j * n + coord.i
                return (
                    <BoardCell key={coordKey(coord)} cell={cells[index]} coord={coord}/>
                )
            })}
        </svg>
    )
}
