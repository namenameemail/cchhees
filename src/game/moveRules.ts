import { BoardParameters } from './types/boardParameters'
import { CellCoord, coordKey, coordsEqual, isCoordInGrid } from './types/coords'
import {
    FigureCatalog,
    FigureDefinition,
    FigureId,
    FigureMoveDirection,
    FigureMoveRule,
    FigureMoveVariant,
    FigurePlacement,
    FigureState,
    FigureTeams,
} from './types/figures'
import { FiguresSlice } from './state/slices'
import { getTopOfStack, isStackOccupied } from './figureStack'
import {
    areSameFigureTeam,
    hasFigureMoveRules,
    normalizeFigureMoveRules,
    normalizeFigurePlacement,
    resolveFigureMoveDirectionFromCatalog,
    resolveFigureState,
    resolvePlacementStateIndex,
} from './figureView'
import { FigureEventAreaCell } from './types/events'
import { evaluateMoveVariantConditions, MoveVariantConditionContext } from './moveRules/evaluateMoveConditions'

export interface MoveDelta {
    di: number
    dj: number
}

export function getMoveDelta(from: CellCoord, to: CellCoord): MoveDelta {
    return {
        di: to.i - from.i,
        dj: to.j - from.j,
    }
}

export function matchMoveSteps(delta: MoveDelta, rule: { x: number; y: number }): number | null {
    const { x, y } = rule
    const { di, dj } = delta

    if (x === 0 && y === 0 || di === 0 && dj === 0) {
        return null
    }

    if (x === 0) {
        if (di !== 0 || dj % y !== 0) {
            return null
        }

        const k = dj / y

        return Number.isInteger(k) && k >= 1 ? k : null
    }

    if (y === 0) {
        if (dj !== 0 || di % x !== 0) {
            return null
        }

        const k = di / x

        return Number.isInteger(k) && k >= 1 ? k : null
    }

    if (di % x !== 0 || dj % y !== 0) {
        return null
    }

    const kx = di / x
    const ky = dj / y

    return kx === ky && Number.isInteger(kx) && kx >= 1 ? kx : null
}

function satisfiesVariantLength(k: number, length: number): boolean {
    if (length === 0) {
        return k >= 1
    }

    return k >= 1 && k <= length
}

export function getCoordAlongRule(from: CellCoord, rule: { x: number; y: number }, k: number): CellCoord {
    return {
        i: from.i + rule.x * k,
        j: from.j + rule.y * k,
    }
}

export function collectIntermediateCells(
    from: CellCoord,
    rule: { x: number; y: number },
    k: number,
): CellCoord[] {
    const cells: CellCoord[] = []

    for (let step = 1; step < k; step += 1) {
        cells.push(getCoordAlongRule(from, rule, step))
    }

    return cells
}

function gcd(a: number, b: number): number {
    const absA = Math.abs(a)
    const absB = Math.abs(b)

    if (absA === 0) {
        return absB
    }

    if (absB === 0) {
        return absA
    }

    let x = absA
    let y = absB

    while (y !== 0) {
        const remainder = x % y
        x = y
        y = remainder
    }

    return x
}

export function collectMinUnitPathCells(
    from: CellCoord,
    rule: { x: number; y: number },
    k: number,
): CellCoord[] {
    const g = gcd(rule.x, rule.y)
    const totalUnits = k * g
    const unitX = rule.x / g
    const unitY = rule.y / g
    const cells: CellCoord[] = []

    for (let step = 1; step < totalUnits; step += 1) {
        cells.push({
            i: from.i + unitX * step,
            j: from.j + unitY * step,
        })
    }

    return cells
}

function isOccupiedByOther(
    coord: CellCoord,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement?: FigurePlacement,
): boolean {
    if (!isStackOccupied({ figuresByCoord, tray: [] }, coord)) {
        return false
    }

    const occupant = getTopOfStack({ figuresByCoord, tray: [] }, coord)

    if (!occupant) {
        return false
    }

    return !actorPlacement || occupant.instanceId !== actorPlacement.instanceId
}

function isPathClear(
    from: CellCoord,
    rule: { x: number; y: number },
    k: number,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement?: FigurePlacement,
    useMinUnitSteps = false,
): boolean {
    const pathCells = useMinUnitSteps
        ? collectMinUnitPathCells(from, rule, k)
        : collectIntermediateCells(from, rule, k)

    return pathCells.every(coord => (
        !isOccupiedByOther(coord, figuresByCoord, actorPlacement)
    ))
}

function isLandingEmpty(
    to: CellCoord,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement?: FigurePlacement,
): boolean {
    return !isOccupiedByOther(to, figuresByCoord, actorPlacement)
}

function isCaptureLandingAllowed(
    to: CellCoord,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement: FigurePlacement | undefined,
    allowOwnTeam: boolean,
    catalog: FigureCatalog | undefined,
): boolean {
    if (!isOccupiedByOther(to, figuresByCoord, actorPlacement)) {
        return false
    }

    if (allowOwnTeam || !catalog || !actorPlacement) {
        return true
    }

    const targetAtTo = getTopOfStack({ figuresByCoord, tray: [] }, to)

    if (!targetAtTo) {
        return false
    }

    return !areSameFigureTeam(catalog, actorPlacement.figureId, targetAtTo.figureId)
}

function isJumpableOccupant(
    coord: CellCoord,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement: FigurePlacement | undefined,
    allowOwnTeam: boolean,
    catalog: FigureCatalog | undefined,
): boolean {
    if (!isOccupiedByOther(coord, figuresByCoord, actorPlacement)) {
        return false
    }

    if (allowOwnTeam || !catalog || !actorPlacement) {
        return true
    }

    const occupant = getTopOfStack({ figuresByCoord, tray: [] }, coord)

    if (!occupant) {
        return false
    }

    return !areSameFigureTeam(catalog, actorPlacement.figureId, occupant.figureId)
}

function collectJumpedFigures(
    from: CellCoord,
    rule: { x: number; y: number },
    h: number,
    figuresByCoord: FiguresSlice['figuresByCoord'],
): FigurePlacement[] {
    const hopped: FigurePlacement[] = []

    for (let step = 1; step <= h; step += 1) {
        const coord = getCoordAlongRule(from, rule, step)
        const occupant = getTopOfStack({ figuresByCoord, tray: [] }, coord)

        if (occupant) {
            hopped.push(occupant)
        }
    }

    return hopped
}

function satisfiesJumpOverMove(
    from: CellCoord,
    to: CellCoord,
    rule: { x: number; y: number },
    k: number,
    variant: FigureMoveVariant,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement: FigurePlacement | undefined,
    catalog: FigureCatalog | undefined,
): FigurePlacement[] | null {
    const h = k - 1

    if (h < 1 || !satisfiesVariantLength(h, variant.length)) {
        return null
    }

    const allowOwnTeam = variant.allowOwnTeam === true

    for (let step = 1; step <= h; step += 1) {
        const coord = getCoordAlongRule(from, rule, step)

        if (!isJumpableOccupant(coord, figuresByCoord, actorPlacement, allowOwnTeam, catalog)) {
            return null
        }
    }

    if (!isLandingEmpty(to, figuresByCoord, actorPlacement)) {
        return null
    }

    return collectJumpedFigures(from, rule, h, figuresByCoord)
}

interface MoveCheckContext {
    from: CellCoord
    to: CellCoord
    orientedRule: FigureMoveRule
    k: number
    figuresByCoord: FiguresSlice['figuresByCoord']
    actorPlacement?: FigurePlacement
    catalog?: FigureCatalog
    boardParameters: BoardParameters
    definitionId: FigureId
}

function buildConditionContext(
    ctx: MoveCheckContext,
    hoppedFigures?: FigurePlacement[],
): MoveVariantConditionContext | null {
    if (!ctx.actorPlacement || !ctx.catalog) {
        return null
    }

    return {
        from: ctx.from,
        to: ctx.to,
        actorPlacement: ctx.actorPlacement,
        catalog: ctx.catalog,
        figuresByCoord: ctx.figuresByCoord,
        boardParameters: ctx.boardParameters,
        ownerFigureId: ctx.definitionId,
        hoppedFigures,
    }
}

function satisfiesEmptyVariant(ctx: MoveCheckContext): boolean {
    const variant = ctx.orientedRule.empty

    if (!variant.enabled || !satisfiesVariantLength(ctx.k, variant.length)) {
        return false
    }

    if (!isPathClear(
        ctx.from,
        ctx.orientedRule,
        ctx.k,
        ctx.figuresByCoord,
        ctx.actorPlacement,
        variant.emptyPath === true,
    )) {
        return false
    }

    if (!isLandingEmpty(ctx.to, ctx.figuresByCoord, ctx.actorPlacement)) {
        return false
    }

    const conditionCtx = buildConditionContext(ctx)

    if (!conditionCtx) {
        return true
    }

    return evaluateMoveVariantConditions(variant.conditions, conditionCtx)
}

function satisfiesCaptureVariant(ctx: MoveCheckContext): boolean {
    const variant = ctx.orientedRule.capture

    if (!variant.enabled || !satisfiesVariantLength(ctx.k, variant.length)) {
        return false
    }

    if (!isPathClear(ctx.from, ctx.orientedRule, ctx.k, ctx.figuresByCoord, ctx.actorPlacement)) {
        return false
    }

    if (!isCaptureLandingAllowed(
        ctx.to,
        ctx.figuresByCoord,
        ctx.actorPlacement,
        variant.allowOwnTeam === true,
        ctx.catalog,
    )) {
        return false
    }

    const conditionCtx = buildConditionContext(ctx)

    if (!conditionCtx) {
        return true
    }

    return evaluateMoveVariantConditions(variant.conditions, conditionCtx)
}

function satisfiesJumpOverVariant(ctx: MoveCheckContext): boolean {
    const variant = ctx.orientedRule.jumpOver

    if (!variant.enabled) {
        return false
    }

    const hoppedFigures = satisfiesJumpOverMove(
        ctx.from,
        ctx.to,
        ctx.orientedRule,
        ctx.k,
        variant,
        ctx.figuresByCoord,
        ctx.actorPlacement,
        ctx.catalog,
    )

    if (!hoppedFigures) {
        return false
    }

    const conditionCtx = buildConditionContext(ctx, hoppedFigures)

    if (!conditionCtx) {
        return true
    }

    return evaluateMoveVariantConditions(variant.conditions, conditionCtx)
}

function satisfiesMoveRuleVariants(ctx: MoveCheckContext): boolean {
    return satisfiesEmptyVariant(ctx)
        || satisfiesCaptureVariant(ctx)
        || satisfiesJumpOverVariant(ctx)
}

export function rotateMoveVector(
    x: number,
    y: number,
    direction: FigureMoveDirection,
): { x: number; y: number } {
    let rotated: { x: number; y: number }

    switch (direction) {
        case 'left':
            rotated = { x: y, y: -x }
            break
        case 'down':
            rotated = { x: -x, y: -y }
            break
        case 'right':
            rotated = { x: -y, y: x }
            break
        case 'up':
        default:
            rotated = { x, y }
            break
    }

    return {
        x: rotated.x === 0 ? 0 : Math.trunc(rotated.x),
        y: rotated.y === 0 ? 0 : Math.trunc(rotated.y),
    }
}

export function orientAreaCell(
    cell: FigureEventAreaCell,
    direction: FigureMoveDirection,
): FigureEventAreaCell {
    const rotated = rotateMoveVector(cell.x, cell.y, direction)

    return { x: rotated.x, y: rotated.y }
}

export function orientAreaCells(
    cells: FigureEventAreaCell[],
    direction: FigureMoveDirection,
): FigureEventAreaCell[] {
    return cells.map(cell => orientAreaCell(cell, direction))
}

export function moveDirectionGridTransform(direction: FigureMoveDirection): string {
    switch (direction) {
        case 'right':
            return 'rotate(-90deg)'
        case 'down':
            return 'rotate(180deg)'
        case 'left':
            return 'rotate(90deg)'
        case 'up':
        default:
            return 'none'
    }
}

export function orientMoveRule(rule: FigureMoveRule, direction: FigureMoveDirection): FigureMoveRule {
    const rotated = rotateMoveVector(rule.x, rule.y, direction)

    return {
        ...rule,
        x: rotated.x,
        y: rotated.y,
    }
}

function resolvePlayStateForActor(
    definition: FigureDefinition,
    actorPlacement?: FigurePlacement,
): FigureState {
    if (!actorPlacement) {
        return resolveFigureState(definition, 0)
    }

    return resolveFigureState(
        definition,
        resolvePlacementStateIndex(normalizeFigurePlacement(actorPlacement)),
    )
}

export function isFigureMoveAllowed(
    from: CellCoord,
    to: CellCoord,
    definition: FigureDefinition,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    boardParameters: BoardParameters,
    actorPlacement?: FigurePlacement,
    catalog?: FigureCatalog,
    freeMove?: boolean,
    figureTeams?: FigureTeams,
): boolean {
    if (coordsEqual(from, to)) {
        return false
    }

    const { n, m } = boardParameters

    if (!isCoordInGrid(to, n, m)) {
        return false
    }

    const playState = resolvePlayStateForActor(definition, actorPlacement)
    const moveRules = normalizeFigureMoveRules(playState.moveRules)

    if (freeMove || moveRules.length === 0) {
        return isLandingEmpty(to, figuresByCoord, actorPlacement)
            || isCaptureLandingAllowed(to, figuresByCoord, actorPlacement, true, catalog)
    }

    const delta = getMoveDelta(from, to)
    const moveDirection = catalog
        ? resolveFigureMoveDirectionFromCatalog(catalog, definition.id, boardParameters, figureTeams)
        : 'up'

    for (const rule of moveRules) {
        const orientedRule = orientMoveRule(rule, moveDirection)
        const k = matchMoveSteps(delta, orientedRule)

        if (k === null) {
            continue
        }

        if (satisfiesMoveRuleVariants({
            from,
            to,
            orientedRule,
            k,
            figuresByCoord,
            actorPlacement,
            catalog,
            boardParameters,
            definitionId: definition.id,
        })) {
            return true
        }
    }

    return false
}

export function collectHoppedFigures(
    from: CellCoord,
    to: CellCoord,
    moveRules: FigureMoveRule[],
    figuresByCoord: FiguresSlice['figuresByCoord'],
    moveDirection: FigureMoveDirection = 'up',
    catalog?: FigureCatalog,
    actorPlacement?: FigurePlacement,
): FigurePlacement[] {
    const delta = getMoveDelta(from, to)

    for (const rule of moveRules) {
        const orientedRule = orientMoveRule(rule, moveDirection)
        const k = matchMoveSteps(delta, orientedRule)

        if (k === null || !orientedRule.jumpOver.enabled) {
            continue
        }

        const hopped = satisfiesJumpOverMove(
            from,
            to,
            orientedRule,
            k,
            orientedRule.jumpOver,
            figuresByCoord,
            actorPlacement,
            catalog,
        )

        if (hopped) {
            return hopped
        }
    }

    return []
}

export function getLegalMoveDestinations(
    from: CellCoord,
    definition: FigureDefinition,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    boardParameters: BoardParameters,
    actorPlacement?: FigurePlacement,
    catalog?: FigureCatalog,
    freeMove?: boolean,
    figureTeams?: FigureTeams,
): CellCoord[] {
    const { n, m } = boardParameters
    const playState = resolvePlayStateForActor(definition, actorPlacement)
    const moveRules = normalizeFigureMoveRules(playState.moveRules)
    const destinations: CellCoord[] = []
    const seen = new Set<string>()

    const addDestination = (coord: CellCoord) => {
        if (coordsEqual(coord, from)) {
            return
        }

        const key = coordKey(coord)

        if (seen.has(key)) {
            return
        }

        if (!isFigureMoveAllowed(from, coord, definition, figuresByCoord, boardParameters, actorPlacement, catalog, freeMove, figureTeams)) {
            return
        }

        seen.add(key)
        destinations.push(coord)
    }

    if (freeMove || moveRules.length === 0) {
        for (let j = 0; j < m; j += 1) {
            for (let i = 0; i < n; i += 1) {
                addDestination({ i, j })
            }
        }

        return destinations
    }

    const moveDirection = catalog
        ? resolveFigureMoveDirectionFromCatalog(catalog, definition.id, boardParameters, figureTeams)
        : 'up'

    for (const rule of moveRules) {
        const orientedRule = orientMoveRule(rule, moveDirection)
        const maxK = Math.max(
            orientedRule.empty.enabled && orientedRule.empty.length > 0 ? orientedRule.empty.length : 0,
            orientedRule.capture.enabled && orientedRule.capture.length > 0 ? orientedRule.capture.length : 0,
            orientedRule.jumpOver.enabled && orientedRule.jumpOver.length > 0 ? orientedRule.jumpOver.length + 1 : 0,
        )
        const hasInfinite = (orientedRule.empty.enabled && orientedRule.empty.length === 0)
            || (orientedRule.capture.enabled && orientedRule.capture.length === 0)

        if (hasInfinite) {
            for (let k = 1; ; k += 1) {
                const coord = getCoordAlongRule(from, orientedRule, k)

                if (!isCoordInGrid(coord, n, m)) {
                    break
                }

                addDestination(coord)

                if (!isPathClear(from, orientedRule, k, figuresByCoord, actorPlacement)) {
                    break
                }
            }

            continue
        }

        const limit = Math.max(maxK, n + m)

        for (let k = 1; k <= limit; k += 1) {
            const coord = getCoordAlongRule(from, orientedRule, k)

            if (!isCoordInGrid(coord, n, m)) {
                break
            }

            addDestination(coord)
        }
    }

    return destinations
}

export function getLegalMoveDestinationKeys(
    from: CellCoord,
    figureId: FigureId,
    definition: FigureDefinition,
    figuresSlice: FiguresSlice,
    boardParameters: BoardParameters,
    catalog?: FigureCatalog,
    freeMove?: boolean,
): Set<string> {
    const actorPlacement = getTopOfStack(figuresSlice, from)

    if (!actorPlacement || actorPlacement.figureId !== figureId) {
        return new Set()
    }

    return new Set(
        getLegalMoveDestinations(
            from,
            definition,
            figuresSlice.figuresByCoord,
            boardParameters,
            actorPlacement,
            catalog,
            freeMove,
        ).map(coordKey),
    )
}

export function isUnrestrictedFigureMovement(
    definition: FigureDefinition,
    actorPlacement?: FigurePlacement,
): boolean {
    return !hasFigureMoveRules(resolvePlayStateForActor(definition, actorPlacement))
}

/** @deprecated use matchMoveSteps */
export function matchMoveRule(delta: MoveDelta, rule: { x: number; y: number; n?: number }): number | null {
    const k = matchMoveSteps(delta, rule)

    if (k === null) {
        return null
    }

    const resolvedN = rule.n === undefined ? 1 : rule.n

    if (resolvedN === 0) {
        return k
    }

    return k >= 1 && k <= resolvedN ? k : null
}
