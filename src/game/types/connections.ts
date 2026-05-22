
export interface ConnectionParams {
    strokeWidth?: number
    strokeColor?: string
    strokeDasharray?: string
    strokeLinecap?: string
}


export enum ConnectionConditionItemType {
    anbDiagonalUp = 'anbDiagonalUp',
    anbDiagonalDown = 'anbDiagonalDown',
    anbVertical = 'anbVertical',
    anbHorizontal = 'anbHorizontal',
    xFrom = 'xFrom',
    xTo = 'xTo',
    yFrom = 'yFrom',
    yTo = 'yTo',
}

export interface ConnectionConditionItem {
    type: ConnectionConditionItemType
    paramsByType?: {
        [key: string]: any | undefined
    }
}

export interface BoardConnectionsConditionItem {
    connectionConditions: ConnectionConditionItem[]
    connectionParams: ConnectionParams
}
