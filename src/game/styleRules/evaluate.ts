import { getConditionFunctionByType } from '../context/conditions'
import { ConnectionData, getConnectionConditionFunctionByType, getConnections } from '../context/connections'
import { CellConditionItem } from '../types/conditions'
import { ConnectionConditionItem } from '../types/connections'
import { CellCoord, coordKey, iterGridCoords } from '../types/coords'
import { BoardStyleRule, isCellStyleRule, isConnectionStyleRule } from '../types/styleRules'

export type ConnectionKey = string

export function connectionDataToKey(data: ConnectionData): ConnectionKey {
    return `${data.iFrom},${data.jFrom}-${data.iTo},${data.jTo}`
}

export interface StyleRuleDrawPlan {
    cellLayers: Map<number, CellCoord[]>
    connectionLayers: Map<number, ConnectionKey[]>
}

function matchesCellConditions(cellConditions: CellConditionItem[], i: number, j: number): boolean {
    if (!cellConditions.length) {
        return false
    }

    return cellConditions.every(cellCondition => (
        getConditionFunctionByType[cellCondition.type]?.(
            cellCondition.paramsByType?.[cellCondition.type],
        )?.(i, j) ?? false
    ))
}

function matchesConnectionConditions(
    connectionConditions: ConnectionConditionItem[],
    data: ConnectionData,
    n: number,
): boolean {
    return connectionConditions.reduce<boolean>((result, connectionCondition) => (
        result
        && (getConnectionConditionFunctionByType[connectionCondition.type]
            ?.(connectionCondition.paramsByType?.[connectionCondition.type], n)
            ?.(data) ?? false)
    ), true)
}

function collectCellDrawRuleIndices(rules: BoardStyleRule[], coord: CellCoord): number[] {
    let winningIndex = -1
    const drawIndices: number[] = []

    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const rule = rules[ruleIndex]

        if (!isCellStyleRule(rule)) {
            continue
        }

        if (!matchesCellConditions(rule.cellConditions, coord.i, coord.j)) {
            continue
        }

        winningIndex = ruleIndex

        if (rule.force) {
            drawIndices.push(ruleIndex)
        }
    }

    if (winningIndex >= 0 && !drawIndices.includes(winningIndex)) {
        drawIndices.push(winningIndex)
    }

    return drawIndices
}

function collectConnectionDrawRuleIndices(
    rules: BoardStyleRule[],
    data: ConnectionData,
    n: number,
): number[] {
    let winningIndex = -1
    const drawIndices: number[] = []

    for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const rule = rules[ruleIndex]

        if (!isConnectionStyleRule(rule)) {
            continue
        }

        if (!matchesConnectionConditions(rule.connectionConditions, data, n)) {
            continue
        }

        winningIndex = ruleIndex

        if (rule.force) {
            drawIndices.push(ruleIndex)
        }
    }

    if (winningIndex >= 0 && !drawIndices.includes(winningIndex)) {
        drawIndices.push(winningIndex)
    }

    return drawIndices
}

export function buildStyleRuleDrawPlan(
    rules: BoardStyleRule[],
    n: number,
    m: number,
): StyleRuleDrawPlan {
    const cellLayers = new Map<number, CellCoord[]>()
    const connectionLayers = new Map<number, ConnectionKey[]>()

    for (const coord of iterGridCoords(n, m)) {
        for (const ruleIndex of collectCellDrawRuleIndices(rules, coord)) {
            const layer = cellLayers.get(ruleIndex)

            if (layer) {
                layer.push(coord)
            } else {
                cellLayers.set(ruleIndex, [coord])
            }
        }
    }

    const connections = getConnections(n, m)

    for (const fromKey of Object.keys(connections)) {
        for (const toKey of Object.keys(connections[fromKey] ?? {})) {
            const data = connections[fromKey][toKey]

            if (!data) {
                continue
            }

            const connectionKey = connectionDataToKey(data)

            for (const ruleIndex of collectConnectionDrawRuleIndices(rules, data, n)) {
                const layer = connectionLayers.get(ruleIndex)

                if (layer) {
                    layer.push(connectionKey)
                } else {
                    connectionLayers.set(ruleIndex, [connectionKey])
                }
            }
        }
    }

    return { cellLayers, connectionLayers }
}

export function findConnectionDataByKey(
    connections: ReturnType<typeof getConnections>,
    connectionKey: ConnectionKey,
): ConnectionData | undefined {
    for (const fromKey of Object.keys(connections)) {
        for (const toKey of Object.keys(connections[fromKey] ?? {})) {
            const data = connections[fromKey][toKey]

            if (data && connectionDataToKey(data) === connectionKey) {
                return data
            }
        }
    }

    return undefined
}

export function coordToLayerKey(coord: CellCoord): string {
    return coordKey(coord)
}
