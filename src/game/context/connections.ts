import { coordKey } from '../types/coords'
import { CellConditionItemType } from '../types/conditions'
import { ConnectionConditionItemType } from '../types/connections'

export interface ConnectionData {
    ii
    jj
    iFrom
    jFrom
    iTo
    jTo
}

export const getConnectionConditionFunctionByType = {
    [ConnectionConditionItemType.anbDiagonalUp]: (params, n) => (data: ConnectionData): boolean => {
        const { ii, jj, iFrom, jFrom } = data

        const isUpRight = (ii > 0) && (jj < 0)
        const isDownLeft = (ii < 0) && (jj > 0)
        const isDiagonalUp = isDownLeft || isUpRight
        if (!isDiagonalUp) return false

        const { a = 0, b = 0 } = params || {}
        const i = iFrom + jFrom

        return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    },
    [ConnectionConditionItemType.anbDiagonalDown]: (params, n) => (data: ConnectionData) => {
        const { ii, jj, iFrom, jFrom } = data

        const isUpLeft = (ii < 0) && (jj < 0)

        const isDownRight = (ii > 0) && (jj > 0)
        const isDiagonalDown = isUpLeft || isDownRight
        if (!isDiagonalDown) return false

        const { a = 0, b = 0 } = params || {}
        const i = (n - 1 - iFrom) + jFrom

        return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    },
    [ConnectionConditionItemType.anbVertical]: (params, n) => (data: ConnectionData): boolean => {
        const { ii, jj, iFrom, jFrom } = data

        const isVertical = !ii && jj
        if (!isVertical) return false

        const { a = 0, b = 0 } = params || {}
        const i = iFrom

        return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    },
    [ConnectionConditionItemType.anbHorizontal]: (params, n) => (data: ConnectionData) => {
        const { ii, jj, jFrom } = data

        const isHorizontal = ii && !jj
        if (!isHorizontal) return false

        const { a = 0, b = 0 } = params || {}
        const i = jFrom

        return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    },
    [CellConditionItemType.xFrom]: (params) => ({ iFrom, jFrom }) => (params?.x - 1) < iFrom,
    [CellConditionItemType.xTo]: (params) => ({ iFrom, jFrom }) => (params?.x -1) > iFrom,
    [CellConditionItemType.yFrom]: (params) => ({ iFrom, jFrom }) => (params?.y - 1) <= jFrom,
    [CellConditionItemType.yTo]: (params) => ({ iFrom, jFrom }) => (params?.y - 1) >= jFrom,
}

export const getConnections = (width: number, height: number) => {
    const connections: Record<string, Record<string, ConnectionData | null>> = {}

    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            const fromKey = coordKey({ i, j })
            const cellConnections: Record<string, ConnectionData | null> = {}

            for (let ii = -1; ii <= 1; ii++) {
                for (let jj = -1; jj <= 1; jj++) {
                    if (ii || jj) {
                        const iii = i + ii
                        const jjj = j + jj
                        const toKey = coordKey({ i: iii, j: jjj })

                        const data: ConnectionData = {
                            ii, jj, iFrom: i, jFrom: j, iTo: iii, jTo: jjj,
                        }

                        if (
                            iii >= 0
                            && jjj >= 0
                            && iii <= (width - 1)
                            && jjj <= (height - 1)
                            && (!connections[toKey]?.[fromKey])
                        ) {
                            cellConnections[toKey] = data
                        } else {
                            cellConnections[toKey] = null
                        }
                    }
                }
            }

            connections[fromKey] = cellConnections
        }
    }

    return connections
}
