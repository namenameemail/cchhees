import { FigureCatalog, FigureDefinitions, FigureId } from './figures'
import { Cell } from './cells'
import { BoardConnectionsConditionItem } from './connections'
import { BoardConditionItem } from './conditions'
import { BoardParameters } from './boardParameters'

export interface GameState {

    boardParameters: BoardParameters

    boardConditions: BoardConditionItem[]
    connectionsConditions: BoardConnectionsConditionItem[]

    figureCatalog: FigureCatalog

    /** @deprecated Migrated to figureCatalog */
    figureDefinitions?: FigureDefinitions

    tray: FigureId[]
    cells: Cell[]

}