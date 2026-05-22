import { CellParameters } from './cells'

export enum CellConditionItemType {
    all = 'all',
    white = 'white',
    black = 'black',
    oddRow = 'oddRow',
    evenRow = 'evenRow',
    oddCol = 'oddCol',
    evenCol = 'evenCol',
    coordinates = 'coordinates',
    coordinateX = 'coordinateX',
    coordinateY = 'coordinateY',
    anbX = 'anbX',
    anbY = 'anbY',
    xFrom = 'xFrom',
    xTo = 'xTo',
    yFrom = 'yFrom',
    yTo = 'yTo',
}

export interface AnbParams {
    a: number
    b: number
}

export interface CellConditionItem {
    type: CellConditionItemType
    paramsByType?: {
        [CellConditionItemType.anbX]?: AnbParams
        [CellConditionItemType.anbY]?: AnbParams
    }
}

export interface BoardConditionItem {
    cellConditions: CellConditionItem[]
    cellParams: CellParameters
}