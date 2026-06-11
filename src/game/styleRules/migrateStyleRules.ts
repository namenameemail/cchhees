import { BoardConditionItem } from '../types/conditions'
import { BoardConnectionsConditionItem } from '../types/connections'
import { GameState } from '../types/gameState'
import { BoardSlice } from '../state/slices'
import { SliceHistory } from '../types/history'
import { BoardStyleRule, CellStyleRule, ConnectionStyleRule } from '../types/styleRules'

export interface LegacyGameStateWithConditions extends Omit<GameState, 'styleRules'> {
    boardConditions?: BoardConditionItem[]
    connectionsConditions?: BoardConnectionsConditionItem[]
    styleRules?: BoardStyleRule[]
}

export interface LegacyBoardSliceWithConditions extends Omit<BoardSlice, 'styleRules'> {
    boardConditions?: BoardConditionItem[]
    connectionsConditions?: BoardConnectionsConditionItem[]
    styleRules?: BoardStyleRule[]
}

function cellConditionToRule(item: BoardConditionItem): CellStyleRule {
    return {
        kind: 'cell',
        force: false,
        cellConditions: [...item.cellConditions],
        cellParams: item.cellParams,
    }
}

function connectionConditionToRule(item: BoardConnectionsConditionItem): ConnectionStyleRule {
    return {
        kind: 'connection',
        force: false,
        connectionConditions: [...item.connectionConditions],
        connectionParams: item.connectionParams,
    }
}

export function migrateStyleRulesFromLegacy(
    boardConditions: BoardConditionItem[] | undefined,
    connectionsConditions: BoardConnectionsConditionItem[] | undefined,
): BoardStyleRule[] {
    const cellRules = (boardConditions ?? []).map(cellConditionToRule)
    const connectionRules = (connectionsConditions ?? []).map(connectionConditionToRule)

    return [...cellRules, ...connectionRules]
}

function resolveStyleRules(
    existingRules: BoardStyleRule[] | undefined,
    boardConditions: BoardConditionItem[] | undefined,
    connectionsConditions: BoardConnectionsConditionItem[] | undefined,
): BoardStyleRule[] {
    const legacyRules = migrateStyleRulesFromLegacy(boardConditions, connectionsConditions)

    // Prefer saved styleRules when present; but empty [] must not hide legacy boardConditions.
    if (existingRules !== undefined && (existingRules.length > 0 || legacyRules.length === 0)) {
        return existingRules.map(rule => ({ ...rule }))
    }

    return legacyRules
}

export function migrateGameStateStyleRules(state: LegacyGameStateWithConditions): GameState {
    const {
        boardConditions,
        connectionsConditions,
        styleRules: existingRules,
        ...rest
    } = state

    return {
        ...rest,
        styleRules: resolveStyleRules(existingRules, boardConditions, connectionsConditions),
    }
}

export function migrateBoardSliceStyleRules(slice: LegacyBoardSliceWithConditions): BoardSlice {
    const {
        boardConditions,
        connectionsConditions,
        styleRules: existingRules,
        ...rest
    } = slice

    return {
        ...rest,
        styleRules: resolveStyleRules(existingRules, boardConditions, connectionsConditions),
    }
}

export function migrateBoardHistoryStyleRules(
    history: SliceHistory<LegacyBoardSliceWithConditions>,
): SliceHistory<BoardSlice> {
    return {
        before: history.before.map(migrateBoardSliceStyleRules),
        after: history.after.map(migrateBoardSliceStyleRules),
    }
}
