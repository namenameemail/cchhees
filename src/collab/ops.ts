import { BoardParameters } from '../game/types/boardParameters'
import { CellParameters } from '../game/types/cells'
import {
    FigureCatalog,
    FigureDefinition,
    FigureId,
    FigureMoveDirection,
    FigureMoveRule,
    FigureState,
    FigureTeams,
    FigureViewParams,
} from '../game/types/figures'
import { FigureEventRule } from '../game/types/events'
import { BoardStyleRule } from '../game/types/styleRules'
import { BoardSlice, FiguresSlice, composeGameState, cloneFigureCatalog } from '../game/state/slices'
import { cloneBoardSlice, cloneFiguresSlice } from '../game/state/reconcile'
import { removeFigureFromBoard } from '../game/state/figureReferences'
import { normalizeFigureCatalog, normalizeFigureEventRules, normalizeFigureMoveDirection, normalizeFigureMoveRules, normalizeFigureState, resolveCollabStateIndex, updateFigureCatalogStateAtIndex } from '../game/figureView'
import { normalizeFigureTeams } from '../game/figureTeams'
import { stripCatalogEventRules } from '../game/state/boardEventRules'
import { GameState } from '../game/types/gameState'

/** Minimal collaborative edit operation — only what changed. */
export type CollabOp =
    | { kind: 'figures'; boardId: string; figures: FiguresSlice }
    | { kind: 'board-parameters'; boardId: string; boardParameters: BoardParameters }
    | { kind: 'style-rules'; boardId: string; styleRules: BoardStyleRule[] }
    | { kind: 'cell-parameters'; boardId: string; coordKey: string; parameters: CellParameters | null }
    | { kind: 'figure-view-params'; figureId: FigureId; viewParams: FigureViewParams; stateIndex?: number }
    | { kind: 'figure-move-rules'; figureId: FigureId; moveRules: FigureMoveRule[]; stateIndex?: number; jumpOverPieces?: boolean; canStepOnOwnTeam?: boolean; canJumpOverOwnTeam?: boolean }
    | { kind: 'figure-states'; figureId: FigureId; states: FigureState[] }
    | { kind: 'figure-team'; figureId: FigureId; team?: number }
    | { kind: 'figure-teams'; teams: FigureTeams }
    | { kind: 'figure-move-direction'; figureId: FigureId; moveDirection?: FigureMoveDirection }
    | { kind: 'board-event-rules'; boardId: string; eventRules: FigureEventRule[] }
    /** @deprecated migrated to board-event-rules */
    | { kind: 'figure-event-rules'; figureId: FigureId; eventRules: FigureEventRule[] }
    | { kind: 'figure-add'; figure: FigureDefinition }
    | { kind: 'figure-remove'; figureId: FigureId }
    | { kind: 'board-sync'; boardId: string; board: BoardSlice }
    | { kind: 'catalog-sync'; catalog: FigureCatalog }

export function isBoardScopedCollabOp(op: CollabOp): boolean {
    return op.kind !== 'figure-view-params'
        && op.kind !== 'figure-move-rules'
        && op.kind !== 'figure-states'
        && op.kind !== 'figure-team'
        && op.kind !== 'figure-teams'
        && op.kind !== 'figure-move-direction'
        && op.kind !== 'board-event-rules'
        && op.kind !== 'figure-event-rules'
        && op.kind !== 'figure-add'
        && op.kind !== 'figure-remove'
        && op.kind !== 'catalog-sync'
}

export function resolveCollabOpBoardId(op: CollabOp, fallbackBoardId: string): string | null {
    if (!isBoardScopedCollabOp(op)) {
        return null
    }

    if ('boardId' in op && op.boardId) {
        return op.boardId
    }

    return fallbackBoardId
}

export function withBoardId<T extends CollabOp>(op: T, boardId: string): T {
    if (!isBoardScopedCollabOp(op)) {
        return op
    }

    return { ...op, boardId } as T
}

export function normalizeCollabOps(op: CollabOp | CollabOp[]): CollabOp[] {
    return Array.isArray(op) ? op : [op]
}

export function applyCollabOp(
    figuresSlice: FiguresSlice,
    boardSlice: BoardSlice,
    catalog: FigureCatalog,
    op: CollabOp,
): { figures: FiguresSlice; board: BoardSlice; catalog: FigureCatalog } {
    switch (op.kind) {
        case 'figures':
            return {
                figures: cloneFiguresSlice(op.figures),
                board: boardSlice,
                catalog,
            }
        case 'board-parameters':
            return {
                figures: figuresSlice,
                board: cloneBoardSlice({
                    ...boardSlice,
                    boardParameters: op.boardParameters,
                }),
                catalog,
            }
        case 'style-rules':
            return {
                figures: figuresSlice,
                board: cloneBoardSlice({
                    ...boardSlice,
                    styleRules: op.styleRules,
                }),
                catalog,
            }
        case 'cell-parameters': {
            const cellParametersByCoord = { ...boardSlice.cellParametersByCoord }

            if (op.parameters == null) {
                delete cellParametersByCoord[op.coordKey]
            } else {
                cellParametersByCoord[op.coordKey] = op.parameters
            }

            return {
                figures: figuresSlice,
                board: cloneBoardSlice({
                    ...boardSlice,
                    cellParametersByCoord,
                }),
                catalog,
            }
        }
        case 'figure-view-params': {
            const stateIndex = resolveCollabStateIndex(op.stateIndex)

            return {
                figures: figuresSlice,
                board: boardSlice,
                catalog: updateFigureCatalogStateAtIndex(catalog, op.figureId, stateIndex, state => ({
                    ...state,
                    viewParams: op.viewParams,
                })),
            }
        }
        case 'figure-move-rules': {
            const stateIndex = resolveCollabStateIndex(op.stateIndex)

            return {
                figures: figuresSlice,
                board: boardSlice,
                catalog: updateFigureCatalogStateAtIndex(catalog, op.figureId, stateIndex, state => (
                    normalizeFigureState({
                        ...state,
                        moveRules: normalizeFigureMoveRules(op.moveRules, {
                            canStepOnOwnTeam: op.canStepOnOwnTeam ?? state.canStepOnOwnTeam,
                            canJumpOverOwnTeam: op.canJumpOverOwnTeam ?? state.canJumpOverOwnTeam,
                        }),
                    }, op.figureId)
                )),
            }
        }
        case 'figure-states':
            return {
                figures: figuresSlice,
                board: boardSlice,
                catalog: catalog.map(entry => (
                    entry.id === op.figureId
                        ? { ...entry, states: normalizeFigureCatalog([{ id: entry.id, states: op.states }])[0].states }
                        : entry
                )),
            }
        case 'figure-team': {
            const team = op.team === undefined ? undefined : Math.trunc(op.team)

            return {
                figures: figuresSlice,
                board: boardSlice,
                catalog: catalog.map(entry => {
                    if (entry.id !== op.figureId) {
                        return entry
                    }

                    if (team === undefined) {
                        const { team: _removed, ...rest } = entry
                        return rest
                    }

                    return { ...entry, team }
                }),
            }
        }
        case 'figure-move-direction': {
            const moveDirection = op.moveDirection === undefined
                ? undefined
                : normalizeFigureMoveDirection(op.moveDirection)

            return {
                figures: figuresSlice,
                board: boardSlice,
                catalog: catalog.map(entry => {
                    if (entry.id !== op.figureId) {
                        return entry
                    }

                    if (moveDirection === undefined || moveDirection === 'up') {
                        const { moveDirection: _removed, ...rest } = entry
                        return rest
                    }

                    return { ...entry, moveDirection }
                }),
            }
        }
        case 'board-event-rules':
        case 'figure-event-rules':
            return {
                figures: figuresSlice,
                board: cloneBoardSlice({
                    ...boardSlice,
                    eventRules: normalizeFigureEventRules(op.eventRules),
                }),
                catalog: stripCatalogEventRules(catalog),
            }
        case 'figure-add':
            return {
                figures: figuresSlice,
                board: boardSlice,
                catalog: [...catalog, op.figure],
            }
        case 'figure-remove':
            return {
                figures: cloneFiguresSlice(removeFigureFromBoard(figuresSlice, op.figureId)),
                board: boardSlice,
                catalog: catalog.filter(entry => entry.id !== op.figureId),
            }
        case 'board-sync':
            return {
                figures: figuresSlice,
                board: cloneBoardSlice(op.board),
                catalog,
            }
        case 'catalog-sync':
            return {
                figures: figuresSlice,
                board: boardSlice,
                catalog: cloneFigureCatalog(op.catalog),
            }
        default:
            return { figures: figuresSlice, board: boardSlice, catalog }
    }
}

export function applyCollabOps(
    figuresSlice: FiguresSlice,
    boardSlice: BoardSlice,
    catalog: FigureCatalog,
    ops: CollabOp[],
): { figures: FiguresSlice; board: BoardSlice; catalog: FigureCatalog; state: GameState } {
    let figures = figuresSlice
    let board = boardSlice
    let nextCatalog = catalog

    for (const op of ops) {
        const next = applyCollabOp(figures, board, nextCatalog, op)
        figures = next.figures
        board = next.board
        nextCatalog = next.catalog
    }

    return {
        figures,
        board,
        catalog: nextCatalog,
        state: composeGameState(figures, board, nextCatalog),
    }
}
