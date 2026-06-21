import { FigureCatalog, FigureDefinitions, FigurePlacement } from './figures'
import { Cell } from './cells'
import { BoardParameters } from './boardParameters'
import { BoardStyleRule } from './styleRules'
import { FigureEventRule } from './events'

export interface GameState {

    boardParameters: BoardParameters

    styleRules: BoardStyleRule[]

    eventRules?: FigureEventRule[]

    figureCatalog: FigureCatalog

    /** @deprecated Migrated to figureCatalog */
    figureDefinitions?: FigureDefinitions

    tray: FigurePlacement[]
    cells: Cell[]

}
