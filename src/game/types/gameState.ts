import { FigureTypes } from './figures'
import { Cell } from './cells'
import { BoardConnectionsConditionItem } from './connections'
import { BoardConditionItem } from './conditions'
import { BoardParameters } from './boardParameters'

export interface GameState {

    boardParameters: BoardParameters

    boardConditions: BoardConditionItem[]
    connectionsConditions: BoardConnectionsConditionItem[]

    tray: FigureTypes[]
    cells: Cell[]

}