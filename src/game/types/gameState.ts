import { FigureCatalog, FigureDefinitions, FigureId } from './figures'
import { Cell } from './cells'
import { BoardParameters } from './boardParameters'
import { BoardStyleRule } from './styleRules'

export interface GameState {

    boardParameters: BoardParameters

    styleRules: BoardStyleRule[]

    figureCatalog: FigureCatalog

    /** @deprecated Migrated to figureCatalog */
    figureDefinitions?: FigureDefinitions

    tray: FigureId[]
    cells: Cell[]

}
