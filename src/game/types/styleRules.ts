import { CellParameters } from './cells'
import { CellConditionItem } from './conditions'
import { ConnectionConditionItem, ConnectionParams } from './connections'

export type BoardStyleRuleKind = 'cell' | 'connection'

export interface CellStyleRule {
    kind: 'cell'
    force?: boolean
    cellConditions: CellConditionItem[]
    cellParams: CellParameters
}

export interface ConnectionStyleRule {
    kind: 'connection'
    force?: boolean
    connectionConditions: ConnectionConditionItem[]
    connectionParams: ConnectionParams
}

export type BoardStyleRule = CellStyleRule | ConnectionStyleRule

export function isCellStyleRule(rule: BoardStyleRule): rule is CellStyleRule {
    return rule.kind === 'cell'
}

export function isConnectionStyleRule(rule: BoardStyleRule): rule is ConnectionStyleRule {
    return rule.kind === 'connection'
}
