import { FigureId } from './figures'

/** Future: board-level and cell-level event owners */
export type EventOwnerKind = 'board' | 'cell' | 'figure'

export type StepCause = 'any' | 'manual' | 'displacement'

export interface FigureEventFigureFilter {
    figureId?: FigureId
    stateIndex?: number
}

export enum FigureEventType {
    steppedOnBy = 'steppedOnBy',
    stepOnFigure = 'stepOnFigure',
    enterCell = 'enterCell',
    leaveCell = 'leaveCell',
    enterRect = 'enterRect',
    enterFigureArea = 'enterFigureArea',
    areaEnteredBy = 'areaEnteredBy',
    leaveBoard = 'leaveBoard',
}

export enum GameActionType {
    spawnFigure = 'spawnFigure',
    setSelfState = 'setSelfState',
    setOtherState = 'setOtherState',
    moveToTray = 'moveToTray',
    displaceFigure = 'displaceFigure',
}

export type GameActionTarget = 'steppedOn' | 'steppedBy' | 'areaAnchor'

export interface FigureEventParamsSteppedOnBy {
    stepperFigures?: FigureEventFigureFilter[]
    /** @deprecated migrated to stepperFigures */
    stepperFigureId?: FigureId
    /** @deprecated migrated to stepperFigures */
    stepperStateIndex?: number
    cause?: StepCause
}

export interface FigureEventParamsStepOnFigure {
    targetFigures?: FigureEventFigureFilter[]
    /** @deprecated migrated to targetFigures */
    targetFigureId?: FigureId
    /** @deprecated migrated to targetFigures */
    targetStateIndex?: number
    cause?: StepCause
}

export interface FigureEventParamsEnterCell {
    x: number
    y: number
}

export interface FigureEventParamsEnterRect {
    x1: number
    y1: number
    x2: number
    y2: number
}

export interface FigureEventAreaCell {
    x: number
    y: number
}

export interface FigureEventParamsEnterFigureArea {
    anchorFigures?: FigureEventFigureFilter[]
    cells?: FigureEventAreaCell[]
    /** When true (default), also trigger if a figure stood in a cell and the area engulfed it */
    includePassive?: boolean
    /** @deprecated migrated to anchorFigures */
    figureId?: FigureId
    /** @deprecated migrated to cells */
    halfWidth?: number
    /** @deprecated migrated to cells */
    halfHeight?: number
}

export interface FigureEventParamsAreaEnteredBy {
    entererFigures?: FigureEventFigureFilter[]
    cells?: FigureEventAreaCell[]
    cause?: StepCause
    /** When true (default), also trigger if enterer stood and owner/anchor moved */
    includePassive?: boolean
}

export type FigureEventParams =
    | FigureEventParamsSteppedOnBy
    | FigureEventParamsStepOnFigure
    | FigureEventParamsEnterCell
    | FigureEventParamsEnterRect
    | FigureEventParamsEnterFigureArea
    | FigureEventParamsAreaEnteredBy
    | Record<string, never>

export interface SpawnFigureActionParams {
    figureId: FigureId
    x: number
    y: number
    stateIndex?: number
}

export interface SetSelfStateActionParams {
    stateIndex: number
}

export interface SetOtherStateActionParams {
    stateIndex: number
    target: GameActionTarget
}

export type MoveToTrayActionParams = Record<string, never>

export interface DisplaceFigureActionParams {
    dx: number
    dy: number
}

export type GameActionParams =
    | SpawnFigureActionParams
    | SetSelfStateActionParams
    | SetOtherStateActionParams
    | MoveToTrayActionParams
    | DisplaceFigureActionParams

export interface GameAction {
    type: GameActionType
    params: GameActionParams
}

export interface FigureEventRule {
    id: string
    type: FigureEventType
    params?: FigureEventParams
    actions: GameAction[]
}
