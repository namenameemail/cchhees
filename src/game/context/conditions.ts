import { CellConditionItemType } from '../types/conditions'

export const getConditionFunctionByType = {
    [CellConditionItemType.all]: () => () => true,
    [CellConditionItemType.white]: () => (i, j) => !((i + (j % 2)) % 2),
    [CellConditionItemType.black]: () => (i, j) => !!((i + (j % 2)) % 2),
    [CellConditionItemType.oddCol]: () => (i, j) => !(i % 2),
    [CellConditionItemType.evenCol]: () => (i, j) => !!(i % 2),
    [CellConditionItemType.oddRow]: () => (i, j) => !(j % 2),
    [CellConditionItemType.evenRow]: () => (i, j) => !!(j % 2),
    [CellConditionItemType.anbX]: (params) => (i, j) => {
        const {a = 0, b = 0} = params || {};
        return !!a ? (i >= b && !((i - b) % a)) : (!(i - b))
    },
    [CellConditionItemType.anbY]: (params) => (i, j) => {
        const {a = 0, b = 0} = params || {};
        return !!a ? (j >= b && !((j - b) % a)) : (!(j - b))
    },
    [CellConditionItemType.coordinates]: (params) => (i, j) => (params?.x - 1) === i && (params?.y - 1) === j,
    [CellConditionItemType.coordinateX]: (params) => (i, j) => (params?.x - 1) === i,
    [CellConditionItemType.coordinateY]: (params) => (i, j) => (params?.y - 1) === j,
    [CellConditionItemType.xFrom]: (params) => (i, j) => (params?.x - 1) <= i,
    [CellConditionItemType.xTo]: (params) => (i, j) => (params?.x - 1) >= i,
    [CellConditionItemType.yFrom]: (params) => (i, j) => (params?.y - 1) <= j,
    [CellConditionItemType.yTo]: (params) => (i, j) => (params?.y - 1) >= j,
}