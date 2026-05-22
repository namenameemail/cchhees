import { ijToIndex, indexToIJ } from '../utils'
import { Cell } from '../types/cells'
import { CellConditionItemType } from '../types/conditions'
import { ConnectionConditionItemType } from '../types/connections'

const is = (ii, jj) => {
    const isRight = (ii > 0) && !jj
    const isLeft = (ii < 0) && !jj

    const isUp = (jj < 0) && !ii
    const isDown = (jj > 0) && !ii

    const isUpLeft = (ii < 0) && (jj < 0)
    const isUpRight = (ii > 0) && (jj < 0)

    const isDownLeft = (ii < 0) && (jj > 0)
    const isDownRight = (ii > 0) && (jj > 0)


    const isHorizontal = ii && !jj
    const isVertical = !ii && jj
    const isDiagonal = ii && jj
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
        // return true;
        const { ii, jj, iFrom, jFrom } = data

        const isUpLeft = (ii < 0) && (jj < 0)

        const isDownRight = (ii > 0) && (jj > 0)
        const isDiagonalDown = isUpLeft || isDownRight
        if (!isDiagonalDown) return false

        const { a = 0, b = 0 } = params || {}
        const i = (n - 1 - iFrom) + jFrom

        return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    },
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
        // return true;
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
        // return true;
        const { ii, jj, jFrom } = data

        const isHorizontal = ii && !jj
        if (!isHorizontal) return false

        const { a = 0, b = 0 } = params || {}
        const i = jFrom

        return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    },
    // [CellConditionItemType.black]: () => (i, j) => !!((i + (j % 2)) % 2),
    // [CellConditionItemType.oddCol]: () => (i, j) => !(i % 2),
    // [CellConditionItemType.evenCol]: () => (i, j) => !!(i % 2),
    // [CellConditionItemType.oddRow]: () => (i, j) => !(j % 2),
    // [CellConditionItemType.evenRow]: () => (i, j) => !!(j % 2),
    // [CellConditionItemType.anbX]: (params) => (i, j) => {
    //     const {a = 0, b = 0} = params || {};
    //     return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    // },
    // [CellConditionItemType.anbY]: (params) => (i, j) => {
    //     const {a = 0, b = 0} = params || {};
    //     return !!a ? (j >= b && !((j - b) % a)) : (!(j - b))
    // },
    // [CellConditionItemType.coordinates]: (params) => (i, j) => (params?.x - 1) === i && (params?.y - 1) === j,
    // [CellConditionItemType.coordinateX]: (params) => (i, j) => (params?.x - 1) === i,
    // [CellConditionItemType.coordinateY]: (params) => (i, j) => (params?.y - 1) === j,
    [CellConditionItemType.xFrom]: (params) => ({ iFrom, jFrom }) => (params?.x - 1) < iFrom,
    [CellConditionItemType.xTo]: (params) => ({ iFrom, jFrom }) => (params?.x -1) > iFrom,
    [CellConditionItemType.yFrom]: (params) => ({ iFrom, jFrom }) => (params?.y - 1) <= jFrom,
    [CellConditionItemType.yTo]: (params) => ({ iFrom, jFrom }) => (params?.y - 1) >= jFrom,
}

export interface ConnectionData {
    ii
    jj
    iFrom
    jFrom
    iTo
    jTo
}

export const getConnections = (length: number, width: number, height: number) => {


    const connections: Record<number, Record<number, ConnectionData | null>> = {}

    for (let index = 0; index < length; index++) {
        const cellConnections: Record<number, ConnectionData | null> = {}

        const { i, j } = indexToIJ(index, width)

        const isFromBlack = (i + (j % 2)) % 2
        const isFromWhite = !isFromBlack

        const isColumnEven = i % 2
        const isColumnOdd = !isColumnEven
        const isRowEven = j % 2
        const isRowOdd = !isRowEven

        for (let ii = -1; ii <= 1; ii++) {
            for (let jj = -1; jj <= 1; jj++) {
                if (ii || jj) {

                    const isRight = (ii > 0) && !jj
                    const isLeft = (ii < 0) && !jj

                    const isUp = (jj < 0) && !ii
                    const isDown = (jj > 0) && !ii

                    const isUpLeft = (ii < 0) && (jj < 0)
                    const isUpRight = (ii > 0) && (jj < 0)

                    const isDownLeft = (ii < 0) && (jj > 0)
                    const isDownRight = (ii > 0) && (jj > 0)


                    const isHorizontal = ii && !jj
                    const isVertical = !ii && jj
                    const isDiagonal = ii && jj

                    const iii = i + ii
                    const jjj = j + jj

                    const connectToIndex = ijToIndex({ i: iii, j: jjj }, width)


                    const isToColumnEven = iii % 2
                    const isToColumnOdd = !isToColumnEven
                    const isToRowEven = jjj % 2
                    const isToRowOdd = !isToRowEven
                    const isToBlack = (iii + (jjj % 2)) % 2
                    const isToWhite = !isToBlack

                    const data: ConnectionData = {
                        ii, jj, iFrom: i, jFrom: j, iTo: iii, jTo: jjj,
                    }

                    if (
                        iii >= 0
                        && jjj >= 0
                        && iii <= (width - 1)
                        && jjj <= (height - 1)
                        && (!connections[connectToIndex]?.[index])
                    ) {
                        cellConnections[connectToIndex] = data
                    } else {
                        cellConnections[connectToIndex] = null
                    }
                }
            }
        }

        connections[index] = cellConnections
    }

    return connections

}
