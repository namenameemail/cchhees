import { FigureId } from './figures'

/** Future: board-level and cell-level event owners */
export type EventOwnerKind = 'board' | 'cell' | 'figure'

export type StepCause = 'any' | 'manual' | 'displacement'

export enum FigureEventType {
    steppedOnBy = 'steppedOnBy',
    stepOnFigure = 'stepOnFigure',
    enterCell = 'enterCell',
    leaveCell = 'leaveCell',
    enterRect = 'enterRect',
    enterFigureArea = 'enterFigureArea',
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
    stepperFigureId?: FigureId
    stepperStateIndex?: number
    cause?: StepCause
}

export interface FigureEventParamsStepOnFigure {
    targetFigureId?: FigureId
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

export interface FigureEventParamsEnterFigureArea {
    figureId: FigureId
    halfWidth?: number
    halfHeight?: number
}

export type FigureEventParams =
    | FigureEventParamsSteppedOnBy
    | FigureEventParamsStepOnFigure
    | FigureEventParamsEnterCell
    | FigureEventParamsEnterRect
    | FigureEventParamsEnterFigureArea
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
