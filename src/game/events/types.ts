import { BoardParameters } from '../types/boardParameters'
import { CellCoord } from '../types/coords'
import { StepCause } from '../types/events'
import { FigureCatalog, FigureId, FigurePlacement } from '../types/figures'

export interface MoveEventContext {
    from: CellCoord
    to: CellCoord
    actorPlacement: FigurePlacement
    targetAtTo?: FigurePlacement
    capturedPlacement?: FigurePlacement
    swappedTargetCoord?: CellCoord
    boardParameters: BoardParameters
    catalog: FigureCatalog
    areaAnchor?: CellCoord
    stepCause?: StepCause
    stepperPlacement?: FigurePlacement
    stepperCoord?: CellCoord
}

export interface TriggeredFigureEvent {
    ownerFigureId: FigureId
    ruleId: string
    areaAnchor?: CellCoord
}
