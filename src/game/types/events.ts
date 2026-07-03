import { FigureId } from './figures'

/** Future: board-level and cell-level event owners */
export type EventOwnerKind = 'board' | 'cell' | 'figure'

export type StepCause = 'any' | 'manual' | 'displacement'

export type MovePhase = 'before' | 'after' | 'entered' | 'left'

export type StackPositionMode = 'any' | 'top' | 'bottom' | 'fromTop' | 'fromBottom'

export type StackTargetMode = StackPositionMode | 'all'

export type FigureEventConditionMatchMode = 'any' | 'all'

export interface FigureEventFigureFilter {
    figureId?: FigureId
    stateIndex?: number
}

export enum FigureEventType {
    onMove = 'onMove',
    steppedOnBy = 'steppedOnBy',
    leaveBoard = 'leaveBoard',
}

/** @deprecated legacy persisted event types — migrated on load */
export enum LegacyFigureEventType {
    steppedOnBy = 'steppedOnBy',
    stepOnFigure = 'stepOnFigure',
    enterCell = 'enterCell',
    leaveCell = 'leaveCell',
    enterRect = 'enterRect',
    enterFigureArea = 'enterFigureArea',
    areaEnteredBy = 'areaEnteredBy',
    leaveBoard = 'leaveBoard',
}

export enum FigureEventConditionType {
    inBoardArea = 'inBoardArea',
    inFigureArea = 'inFigureArea',
    movedBy = 'movedBy',
    isFigure = 'isFigure',
    isNotFigure = 'isNotFigure',
    exitedBoard = 'exitedBoard',
    hoppedOverFigures = 'hoppedOverFigures',
    hasFigureInArea = 'hasFigureInArea',
}

/** @deprecated legacy persisted condition types — migrated on load, see migrateConditionType */
export enum LegacyFigureEventConditionType {
    onCells = 'onCells',
    aboveFigures = 'aboveFigures',
    belowFigures = 'belowFigures',
    leftCell = 'leftCell',
    landedInBoardArea = 'landedInBoardArea',
    landedInFigureArea = 'landedInFigureArea',
    landedOnCell = 'landedOnCell',
    landedOnFigure = 'landedOnFigure',
    figureEnteredArea = 'figureEnteredArea',
    steppedOnByFigure = 'steppedOnByFigure',
}

/** @deprecated legacy persisted subject — migrated on load */
export type FigureEventConditionSubjectKind = 'moved' | 'steppedOn' | 'filtered'

/** @deprecated legacy persisted subject — migrated on load */
export interface LegacyFigureEventConditionSubject {
    kind: FigureEventConditionSubjectKind
    filter?: FigureEventFigureFilter
}

export interface OrientableCoordinates {
    /** false/undefined = абсолютные координаты доски; true = канонические смещения + orient по команде */
    orientToTeamDirection?: boolean
}

export interface FigureEventSubjectNearby extends OrientableCoordinates {
    enabled?: boolean
    cells?: FigureEventAreaCell[]
}

export interface FigureEventConditionSubject {
    entries: FigureEventFigureFilter[]
    matchMode?: FigureEventConditionMatchMode
    /** только GameAction.subject */
    nearby?: FigureEventSubjectNearby
}

export interface FigureEventBoardRect {
    x1: number
    y1: number
    x2: number
    y2: number
}

export interface FigureEventCoord {
    x: number
    y: number
}

export interface FigureEventAreaCell {
    x: number
    y: number
}

export interface FigureEventConditionParamsInBoardArea extends FigureEventBoardRect, OrientableCoordinates {
    movePhase?: MovePhase
}

export interface FigureEventConditionParamsInFigureArea extends OrientableCoordinates {
    anchorFigures?: FigureEventFigureFilter[]
    cells?: FigureEventAreaCell[]
    movePhase?: MovePhase
    /** значимо только при movePhase 'entered'|'left' */
    includePassive?: boolean
}

export interface FigureEventConditionParamsFigureList {
    figures?: FigureEventFigureFilter[]
    matchMode?: FigureEventConditionMatchMode
}

export interface FigureEventConditionParamsMovedBy extends OrientableCoordinates {
    dx: number
    dy: number
}

export interface FigureEventConditionParamsHasFigureInArea extends OrientableCoordinates {
    figures?: FigureEventFigureFilter[]
    cells?: FigureEventAreaCell[]
    matchMode?: FigureEventConditionMatchMode
    movePhase?: MovePhase
}

export type FigureEventConditionParams =
    | FigureEventConditionParamsInBoardArea
    | FigureEventConditionParamsInFigureArea
    | FigureEventConditionParamsFigureList
    | FigureEventConditionParamsMovedBy
    | FigureEventConditionParamsHasFigureInArea
    | Record<string, never>

/** @deprecated legacy persisted params — migrated to inBoardArea{movePhase} on load */
export interface LegacyFigureEventConditionParamsOnCells extends OrientableCoordinates {
    cells: FigureEventCoord[]
    matchMode?: FigureEventConditionMatchMode
}

/** @deprecated legacy persisted params — migrated to inBoardArea{movePhase:'after'|'left'} on load */
export interface LegacyFigureEventConditionParamsLeftCell extends FigureEventCoord, OrientableCoordinates { }

/** @deprecated legacy persisted params — migrated to inBoardArea{movePhase:'after'} on load */
export interface LegacyFigureEventConditionParamsLandedInBoardArea extends FigureEventBoardRect, OrientableCoordinates { }

/** @deprecated legacy persisted params — migrated to inFigureArea{movePhase:'entered'} on load */
export interface LegacyFigureEventConditionParamsLandedInFigureArea extends OrientableCoordinates {
    anchorFigures?: FigureEventFigureFilter[]
    cells?: FigureEventAreaCell[]
    includePassive?: boolean
}

/** @deprecated legacy persisted params — migrated to inBoardArea{movePhase:'after'} on load */
export interface LegacyFigureEventConditionParamsLandedOnCell extends FigureEventCoord, OrientableCoordinates { }

/** @deprecated legacy persisted params — migrated to hasFigureInArea{cells:[{0,0}],movePhase:'after'} on load */
export interface LegacyFigureEventConditionParamsLandedOnFigure {
    figures?: FigureEventFigureFilter[]
    matchMode?: FigureEventConditionMatchMode
    stackTarget?: StackTargetMode
    stackIndex?: number
}

/** @deprecated legacy persisted params — migrated to inFigureArea{movePhase:'entered'} on load */
export interface LegacyFigureEventConditionParamsFigureEnteredArea extends OrientableCoordinates {
    cells?: FigureEventAreaCell[]
    includePassive?: boolean
}

/** @deprecated legacy persisted params — migrated to hasFigureInArea{cells:[{0,0}],movePhase:'after'} on load */
export interface LegacyFigureEventConditionParamsSteppedOnByFigure {
    stepperFigures?: FigureEventFigureFilter[]
    matchMode?: FigureEventConditionMatchMode
}

export interface FigureEventCondition {
    subject: FigureEventConditionSubject
    type: FigureEventConditionType
    params?: FigureEventConditionParams
}

export enum GameActionType {
    spawnFigure = 'spawnFigure',
    spawnFigureNearby = 'spawnFigureNearby',
    setSelfState = 'setSelfState',
    setOtherState = 'setOtherState',
    moveToTray = 'moveToTray',
    displaceFigure = 'displaceFigure',
    moveToCell = 'moveToCell',
}

export type GameActionTarget = 'steppedOn' | 'steppedBy' | 'areaAnchor'

export interface FigureEventParamsOnMove {
    cause?: StepCause
}

export interface FigureEventParamsSteppedOnBy {
    cause?: StepCause
    stackPosition?: StackPositionMode
    stackIndex?: number
}

export type FigureEventParams =
    | FigureEventParamsOnMove
    | FigureEventParamsSteppedOnBy
    | Record<string, never>

/** @deprecated migrated to conditions */
export interface LegacyFigureEventParamsSteppedOnBy {
    stepperFigures?: FigureEventFigureFilter[]
    stepperFigureId?: FigureId
    stepperStateIndex?: number
    cause?: StepCause
    stackPosition?: StackPositionMode
    stackIndex?: number
}

/** @deprecated migrated to conditions */
export interface LegacyFigureEventParamsStepOnFigure {
    targetFigures?: FigureEventFigureFilter[]
    targetFigureId?: FigureId
    targetStateIndex?: number
    cause?: StepCause
    stackTarget?: StackTargetMode
    stackIndex?: number
}

/** @deprecated migrated to conditions — kept for area normalization helpers */
export type FigureEventParamsStepOnFigure = LegacyFigureEventParamsStepOnFigure

/** @deprecated migrated to conditions */
export type FigureEventParamsEnterFigureArea = LegacyFigureEventParamsEnterFigureArea

/** @deprecated migrated to conditions */
export type FigureEventParamsAreaEnteredBy = LegacyFigureEventParamsAreaEnteredBy

/** @deprecated migrated to conditions */
export interface LegacyFigureEventParamsEnterCell {
    x: number
    y: number
}

/** @deprecated migrated to conditions */
export interface LegacyFigureEventParamsEnterRect extends FigureEventBoardRect { }

/** @deprecated migrated to conditions */
export interface LegacyFigureEventParamsEnterFigureArea {
    anchorFigures?: FigureEventFigureFilter[]
    cells?: FigureEventAreaCell[]
    includePassive?: boolean
    figureId?: FigureId
    halfWidth?: number
    halfHeight?: number
}

/** @deprecated migrated to conditions */
export interface LegacyFigureEventParamsAreaEnteredBy {
    entererFigures?: FigureEventFigureFilter[]
    cells?: FigureEventAreaCell[]
    cause?: StepCause
    includePassive?: boolean
}

export interface SpawnFigureActionParams {
    figureId: FigureId
    x: number
    y: number
    stateIndex?: number
}

export interface SpawnFigureNearbyActionParams extends OrientableCoordinates {
    figureId: FigureId
    dx: number
    dy: number
    stateIndex?: number
}

export interface SetSelfStateActionParams {
    stateIndex: number
}

export interface SetOtherStateActionParams {
    stateIndex: number
    /** @deprecated migrated to action.subject */
    target?: GameActionTarget
}

export type MoveToTrayActionParams = Record<string, never>

export interface DisplaceFigureActionParams extends OrientableCoordinates {
    dx: number
    dy: number
}

export interface MoveToCellActionParams extends OrientableCoordinates {
    x: number
    y: number
}

export type GameActionParams =
    | SpawnFigureActionParams
    | SpawnFigureNearbyActionParams
    | SetSelfStateActionParams
    | SetOtherStateActionParams
    | MoveToTrayActionParams
    | DisplaceFigureActionParams
    | MoveToCellActionParams

export interface GameAction {
    type: GameActionType
    subject?: FigureEventConditionSubject
    params: GameActionParams
}

export interface FigureEventRule {
    id: string
    type: FigureEventType
    params?: FigureEventParams
    conditions: FigureEventCondition[]
    actions: GameAction[]
}

export type PersistedFigureEventRule = {
    id: string
    type: FigureEventType | LegacyFigureEventType | string
    params?: FigureEventParams | Record<string, unknown>
    conditions?: FigureEventCondition[]
    actions: GameAction[]
}

const NEW_FIGURE_EVENT_TYPES = new Set<string>(Object.values(FigureEventType))

export function isLegacyFigureEventType(type: string): boolean {
    return !NEW_FIGURE_EVENT_TYPES.has(type)
}
