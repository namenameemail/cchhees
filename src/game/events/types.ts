import { BoardParameters } from '../types/boardParameters'
import { CellCoord } from '../types/coords'
import { FigureEventType, StepCause, FigureEventConditionType, FigureEventRule } from '../types/events'
import { FigureCatalog, FigureId, FigurePlacement } from '../types/figures'
import { FigureStepRecorder } from '../figureAnimation/figureStepRecorder'

export interface MoveEventContext {
    from: CellCoord
    to: CellCoord
    actorPlacement: FigurePlacement
    targetAtTo?: FigurePlacement
    swappedTargetCoord?: CellCoord
    boardParameters: BoardParameters
    catalog: FigureCatalog
    eventRules: FigureEventRule[]
    areaAnchor?: CellCoord
    eventType?: FigureEventType
    stepCause?: StepCause
    stepperPlacement?: FigurePlacement
    stepperCoord?: CellCoord
    figuresBeforeMove?: Record<string, FigurePlacement[]>
    areaSubjectCoord?: CellCoord
    areaSubjectPlacement?: FigurePlacement
    ownerFigureId?: FigureId
    hoppedFigures?: FigurePlacement[]
    eatedFigures?: FigurePlacement[]
    triggerConditionType?: FigureEventConditionType
    onStep?: FigureStepRecorder
}

export interface TriggeredFigureEvent {
    ruleId: string
    areaAnchor?: CellCoord
    subjectCoord?: CellCoord
    subjectPlacement?: FigurePlacement
    stepOnTarget?: FigurePlacement
    triggerMode?: 'active' | 'passive'
    includePassive?: boolean
    triggerConditionType?: FigureEventConditionType
}
