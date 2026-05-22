import React, { FC, useCallback, useMemo } from 'react'
import styles from '../styles.module.css'
import { useGameContext } from '../context'
import { BoardCell } from './BoardCell'
import { ijToIndex, indexToIJ } from '../utils'
import { Cell, CellParameters } from '../types/cells'
import classNames from 'classnames'
import { getConditionFunctionByType } from '../context/conditions'
import { ConnectionParams } from '../types/connections'
import { ConnectionData, getConnectionConditionFunctionByType, getConnections } from '../context/connections'
import { ConnectionSVGGroup } from './ConnectionSVGGroup'

export interface BoardProps {
    className?: string
}

export interface ConnectionsOptions {
    columnOddHorizontal,
    columnOddVertical,
    columnOddDiagonal,
    columnEvenHorizontal,
    columnEvenVertical,
    columnEvenDiagonal,
    rowOddHorizontal,
    rowOddVertical,
    rowOddDiagonal,
    rowEvenHorizontal,
    rowEvenVertical,
    rowEvenDiagonal,
    disableEven: boolean
    disableOdd: boolean
}


export const Board: FC<BoardProps> = ({ className }) => {

    const { mode, state } = useGameContext()

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
        return (cells.length && n && m) ? getConnections(cells.length, n, m) : []
    }, [n, m, cells.length])

    const boardStyle = useMemo(() => ({
        width: n * cellXDistance,
        height: m * cellYDistance,
    }), [n, m, cellHeight, cellWidth, cellXDistance, cellYDistance])

    const connectionParams = useCallback((connectionData: ConnectionData) => {
        return connectionsConditions.reduce<ConnectionParams>((res, { connectionConditions, connectionParams }) => {
            // const isTrue = connectionConditions?.length
            //     ? connectionConditions.reduce<boolean>((res, connectionCondition) => (
            //         res
            //         && getConnectionConditionFunctionByType[connectionCondition.type]
            //             ?.(connectionCondition.paramsByType?.[connectionCondition.type], n)
            //             ?.(connectionData)
            //     ), true)
            //     : false
            const isTrue = connectionConditions.reduce<boolean>((res, connectionCondition) => (
                res
                && getConnectionConditionFunctionByType[connectionCondition.type]
                    ?.(connectionCondition.paramsByType?.[connectionCondition.type], n)
                    ?.(connectionData)
            ), true)

            return isTrue ? connectionParams : res
        }, {})

    }, [connectionsConditions, n])

    console.log('ccc3', connections)
    return (
        <svg style={boardStyle} className={className}>

            {Object.keys(connections).map((from) => {

                const { i: iFrom, j: jFrom } = indexToIJ(+from, n)

                const xFrom = iFrom * cellXDistance + cellXDistance / 2
                const yFrom = jFrom * cellYDistance + cellYDistance / 2

                return Object.keys(connections[from]).map((to) => {
                    const data = connections[from][to]

                    if (!data) return null

                    const { i: iTo, j: jTo } = indexToIJ(+to, n)


                    const xTo = iTo * cellXDistance + cellXDistance / 2
                    const yTo = jTo * cellYDistance + cellYDistance / 2

                    const params = connectionParams(data)
                    return (
                        <ConnectionSVGGroup key={`${from}-${to}`} x1={xFrom} y1={yFrom} x2={xTo} y2={yTo} connectionParams={params}/>
                    )
                })
            })}
            {state.cells.map((cell, index) => {
                return (
                    <BoardCell key={index} cell={cell} index={index}/>
                )
            })}
        </svg>
    )
}
