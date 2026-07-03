import {
    FigureMoveRule,
    FigureMoveVariant,
    FigureMoveVariantKind,
    LegacyFigureMoveRule,
    LegacyFigureMoveRuleLanding,
} from './types/figures'

export interface MigrateFigureMoveRulesStateFlags {
    jumpOverPieces?: boolean
    canStepOnOwnTeam?: boolean
    canJumpOverOwnTeam?: boolean
}

function isNewMoveRule(rule: LegacyFigureMoveRule | FigureMoveRule): rule is FigureMoveRule {
    const candidate = rule as FigureMoveRule

    return Boolean(
        candidate.empty
        && typeof candidate.empty === 'object'
        && candidate.capture
        && candidate.jumpOver,
    )
}

function createDisabledVariant(kind: FigureMoveVariantKind): FigureMoveVariant {
    return {
        enabled: false,
        length: 1,
        ...(kind === 'capture' || kind === 'jumpOver' ? { allowOwnTeam: false } : {}),
        conditions: [],
    }
}

export function createDefaultMoveVariant(kind: FigureMoveVariantKind): FigureMoveVariant {
    switch (kind) {
        case 'empty':
            return { enabled: true, length: 1, conditions: [] }
        case 'capture':
            return { enabled: true, length: 1, allowOwnTeam: false, conditions: [] }
        case 'jumpOver':
            return { enabled: false, length: 1, allowOwnTeam: false, approach: 1, landing: 1, conditions: [] }
    }
}

export function createDefaultMoveRule(x: number, y: number): FigureMoveRule {
    return {
        x: Math.trunc(x),
        y: Math.trunc(y),
        empty: createDefaultMoveVariant('empty'),
        capture: createDefaultMoveVariant('capture'),
        jumpOver: createDefaultMoveVariant('jumpOver'),
    }
}

function mergeVariant(
    current: FigureMoveVariant,
    patch: Partial<FigureMoveVariant>,
): FigureMoveVariant {
    const length = patch.length !== undefined ? patch.length : current.length
    const approach = patch.approach !== undefined ? patch.approach : current.approach
    const landing = patch.landing !== undefined ? patch.landing : current.landing

    return {
        enabled: patch.enabled ?? current.enabled,
        length: Math.max(0, Math.trunc(length)),
        allowOwnTeam: patch.allowOwnTeam ?? current.allowOwnTeam,
        ...(approach !== undefined ? { approach: Math.max(0, Math.trunc(approach)) } : {}),
        ...(landing !== undefined ? { landing: Math.max(0, Math.trunc(landing)) } : {}),
        conditions: patch.conditions ?? current.conditions,
    }
}

function applyLegacyLanding(
    rule: FigureMoveRule,
    landing: LegacyFigureMoveRuleLanding | undefined,
    length: number,
): FigureMoveRule {
    const resolvedLength = Math.max(0, Math.trunc(length))

    switch (landing ?? 'any') {
        case 'empty':
            return {
                ...rule,
                empty: mergeVariant(rule.empty, { enabled: true, length: resolvedLength }),
            }
        case 'capture':
            return {
                ...rule,
                capture: mergeVariant(rule.capture, { enabled: true, length: resolvedLength }),
            }
        case 'jumpOver':
            return {
                ...rule,
                jumpOver: mergeVariant(rule.jumpOver, { enabled: true, length: resolvedLength }),
            }
        case 'any':
            return {
                ...rule,
                empty: mergeVariant(rule.empty, { enabled: true, length: resolvedLength }),
                capture: mergeVariant(rule.capture, { enabled: true, length: resolvedLength }),
            }
        default:
            return rule
    }
}

function mergeLegacyRuleInto(
    map: Map<string, FigureMoveRule>,
    legacy: LegacyFigureMoveRule,
): void {
    const x = Math.trunc(legacy.x)
    const y = Math.trunc(legacy.y)

    if (x === 0 && y === 0) {
        return
    }

    const key = `${x},${y}`
    const length = legacy.n === undefined ? 1 : Math.trunc(legacy.n)
    const existing = map.get(key) ?? createEmptyMoveRuleShell(x, y)
    const merged = applyLegacyLanding(existing, legacy.landing, length)

    map.set(key, merged)
}

export function migrateLegacyMoveRules(
    rules: LegacyFigureMoveRule[] | undefined,
    stateFlags: MigrateFigureMoveRulesStateFlags = {},
): FigureMoveRule[] {
    const map = new Map<string, FigureMoveRule>()

    for (const rule of rules ?? []) {
        mergeLegacyRuleInto(map, rule)
    }

    const canStepOnOwnTeam = stateFlags.canStepOnOwnTeam === true
    const canJumpOverOwnTeam = stateFlags.canJumpOverOwnTeam === true

    return [...map.values()]
        .sort((left, right) => (left.y - right.y) || (left.x - right.x))
        .map(rule => ({
            ...rule,
            capture: {
                ...rule.capture,
                allowOwnTeam: rule.capture.allowOwnTeam === true || canStepOnOwnTeam,
            },
            jumpOver: {
                ...rule.jumpOver,
                allowOwnTeam: rule.jumpOver.allowOwnTeam === true || canJumpOverOwnTeam,
            },
        }))
}

export function migrateFigureMoveRulesInput(
    rules: Array<LegacyFigureMoveRule | FigureMoveRule> | undefined,
    stateFlags: MigrateFigureMoveRulesStateFlags = {},
): FigureMoveRule[] {
    if (!rules?.length) {
        return []
    }

    const map = new Map<string, FigureMoveRule>()

    for (const rule of rules) {
        if (isNewMoveRule(rule)) {
            const x = Math.trunc(rule.x)
            const y = Math.trunc(rule.y)

            if (x === 0 && y === 0) {
                continue
            }

            map.set(`${x},${y}`, cloneMoveRule(rule))
            continue
        }

        mergeLegacyRuleInto(map, rule)
    }

    const canStepOnOwnTeam = stateFlags.canStepOnOwnTeam === true
    const canJumpOverOwnTeam = stateFlags.canJumpOverOwnTeam === true

    return [...map.values()]
        .sort((left, right) => (left.y - right.y) || (left.x - right.x))
        .map(rule => ({
            ...rule,
            capture: {
                ...rule.capture,
                allowOwnTeam: rule.capture.allowOwnTeam === true || canStepOnOwnTeam,
            },
            jumpOver: {
                ...rule.jumpOver,
                allowOwnTeam: rule.jumpOver.allowOwnTeam === true || canJumpOverOwnTeam,
            },
        }))
}

export function cloneMoveVariant(variant: FigureMoveVariant): FigureMoveVariant {
    return {
        ...variant,
        conditions: variant.conditions?.map(condition => ({ ...condition })),
    }
}

export function cloneMoveRule(rule: FigureMoveRule): FigureMoveRule {
    return {
        x: rule.x,
        y: rule.y,
        empty: cloneMoveVariant(rule.empty),
        capture: cloneMoveVariant(rule.capture),
        jumpOver: cloneMoveVariant(rule.jumpOver),
    }
}

export function createEmptyMoveRuleShell(x: number, y: number): FigureMoveRule {
    return {
        x: Math.trunc(x),
        y: Math.trunc(y),
        empty: createDisabledVariant('empty'),
        capture: createDisabledVariant('capture'),
        jumpOver: createDisabledVariant('jumpOver'),
    }
}
