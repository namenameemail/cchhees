import { FigureMoveRule } from '../../types/figures'

export const MAX_MOVE_GRID_N = 12
export const MOVE_GRID_AREA_SIZE = 200
export const MOVE_GRID_GAP = 2
export const MOVE_GRID_PADDING = 4
export const MIN_MOVE_RULE_N = 0
export const MAX_MOVE_RULE_N = 100

export function ruleKey(x: number, y: number): string {
    return `${x},${y}`
}

export function getFarthestMoveOffset(rules: FigureMoveRule[]): number {
    let farthest = 0

    for (const rule of rules) {
        farthest = Math.max(farthest, Math.abs(Math.trunc(rule.x)), Math.abs(Math.trunc(rule.y)))
    }

    return farthest
}

export function getMinGridN(rules: FigureMoveRule[]): number {
    return Math.max(1, getFarthestMoveOffset(rules))
}

export function clampGridN(n: number, rules: FigureMoveRule[]): number {
    const minN = getMinGridN(rules)
    const truncated = Math.trunc(n)

    if (!Number.isFinite(truncated)) {
        return minN
    }

    return Math.max(minN, Math.min(MAX_MOVE_GRID_N, truncated))
}

export function gridIndexToOffset(gi: number, gj: number, gridN: number): { x: number; y: number } {
    return {
        x: gi - gridN,
        y: gj - gridN,
    }
}

export function offsetToGridIndex(x: number, y: number, gridN: number): { gi: number; gj: number } {
    return {
        gi: x + gridN,
        gj: y + gridN,
    }
}

export function isCenterOffset(x: number, y: number): boolean {
    return x === 0 && y === 0
}

export function rulesToMap(rules: FigureMoveRule[]): Map<string, FigureMoveRule> {
    const map = new Map<string, FigureMoveRule>()

    for (const rule of rules) {
        const x = Math.trunc(rule.x)
        const y = Math.trunc(rule.y)

        if (isCenterOffset(x, y)) {
            continue
        }

        map.set(ruleKey(x, y), { ...rule, x, y })
    }

    return map
}

export function mapToRules(map: Map<string, FigureMoveRule>): FigureMoveRule[] {
    return [...map.values()].sort((left, right) => {
        if (left.y !== right.y) {
            return left.y - right.y
        }

        return left.x - right.x
    })
}

export function upsertRule(rules: FigureMoveRule[], rule: FigureMoveRule): FigureMoveRule[] {
    const map = rulesToMap(rules)
    const x = Math.trunc(rule.x)
    const y = Math.trunc(rule.y)

    if (isCenterOffset(x, y)) {
        return mapToRules(map)
    }

    map.set(ruleKey(x, y), { ...rule, x, y })
    return mapToRules(map)
}

export function removeRule(rules: FigureMoveRule[], x: number, y: number): FigureMoveRule[] {
    const map = rulesToMap(rules)
    map.delete(ruleKey(Math.trunc(x), Math.trunc(y)))
    return mapToRules(map)
}

export function getRuleAt(rules: FigureMoveRule[], x: number, y: number): FigureMoveRule | undefined {
    return rulesToMap(rules).get(ruleKey(Math.trunc(x), Math.trunc(y)))
}

export function clampMoveRuleN(value: number | undefined): number {
    if (value === undefined || Number.isNaN(value)) {
        return 1
    }

    const truncated = Math.trunc(value)

    if (!Number.isFinite(truncated)) {
        return 1
    }

    return Math.max(MIN_MOVE_RULE_N, Math.min(MAX_MOVE_RULE_N, truncated))
}

export function getMoveGridSize(gridN: number): number {
    return gridN * 2 + 1
}

export function getMoveGridCellSize(gridN: number): number {
    const gridSize = getMoveGridSize(gridN)
    const inner = MOVE_GRID_AREA_SIZE - MOVE_GRID_PADDING * 2
    const gaps = (gridSize - 1) * MOVE_GRID_GAP

    return (inner - gaps) / gridSize
}

export function iterGridCells(gridN: number): Array<{ gi: number; gj: number; x: number; y: number }> {
    const size = gridN * 2 + 1
    const cells: Array<{ gi: number; gj: number; x: number; y: number }> = []

    for (let gj = 0; gj < size; gj += 1) {
        for (let gi = 0; gi < size; gi += 1) {
            const { x, y } = gridIndexToOffset(gi, gj, gridN)
            cells.push({ gi, gj, x, y })
        }
    }

    return cells
}
