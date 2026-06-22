import { BoardParameters } from './types/boardParameters'
import { CellCoord, coordKey, coordsEqual, isCoordInGrid } from './types/coords'
import { FigureCatalog, FigureDefinition, FigureId, FigureMoveDirection, FigureMoveRule, FigureMoveRuleLanding, FigurePlacement, FigureState, FigureTeams } from './types/figures'
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

export function matchMoveRule(delta: MoveDelta, rule: { x: number; y: number; n?: number }): number | null {
    const { x, y } = rule
    const { di, dj } = delta

    if (x === 0 && y === 0) {
        return null
    }

    if (di === 0 && dj === 0) {
        return null
    }

    if (x === 0) {
        if (di !== 0) {
            return null
        }

        if (dj % y !== 0) {
            return null
        }

        const k = dj / y

        if (!Number.isInteger(k) || k < 1) {
            return null
        }

        return satisfiesMoveDistance(k, rule.n)
    }

    if (y === 0) {
        if (dj !== 0) {
            return null
        }

        if (di % x !== 0) {
            return null
        }

        const k = di / x

        if (!Number.isInteger(k) || k < 1) {
            return null
        }

        return satisfiesMoveDistance(k, rule.n)
    }

    if (di % x !== 0 || dj % y !== 0) {
        return null
    }

    const kx = di / x
    const ky = dj / y

    if (kx !== ky || !Number.isInteger(kx) || kx < 1) {
        return null
    }

    return satisfiesMoveDistance(kx, rule.n)
}

function satisfiesMoveDistance(k: number, n: number | undefined): number | null {
    const resolvedN = n === undefined ? 1 : n

    if (resolvedN === 0) {
        return k
    }

    if (k >= 1 && k <= resolvedN) {
        return k
    }

    return null
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

    if (k > 1) {
        for (let step = 1; step < k; step += 1) {
            cells.push(getCoordAlongRule(from, rule, step))
        }

        return cells
    }

    const ux = rule.x === 0 ? 0 : Math.sign(rule.x)
    const uy = rule.y === 0 ? 0 : Math.sign(rule.y)
    const steps = Math.max(Math.abs(rule.x), Math.abs(rule.y))

    for (let step = 1; step < steps; step += 1) {
        cells.push({
            i: from.i + ux * step,
            j: from.j + uy * step,
        })
    }

    return cells
}

function satisfiesJumpOverPath(
    from: CellCoord,
    rule: { x: number; y: number },
    k: number,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement?: FigurePlacement,
    catalog?: FigureCatalog,
    canJumpOverOwnTeam?: boolean,
): boolean {
    let hasJumpedFigure = false

    for (const coord of collectIntermediateCells(from, rule, k)) {
        if (!isStackOccupied({ figuresByCoord, tray: [] }, coord)) {
            continue
        }

        const occupant = getTopOfStack({ figuresByCoord, tray: [] }, coord)

        if (!occupant) {
            continue
        }

        if (actorPlacement && occupant.instanceId === actorPlacement.instanceId) {
            continue
        }

        if (
            catalog
            && actorPlacement
            && areSameFigureTeam(catalog, actorPlacement.figureId, occupant.figureId)
            && !canJumpOverOwnTeam
        ) {
            return false
        }

        hasJumpedFigure = true
    }

    return hasJumpedFigure
}

export function isIntermediatePathClear(
    from: CellCoord,
    rule: { x: number; y: number },
    k: number,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    jumpOverPieces: boolean,
    actorPlacement?: FigurePlacement,
    catalog?: FigureCatalog,
    canJumpOverOwnTeam?: boolean,
): boolean {
    if (jumpOverPieces) {
        return true
    }

    return collectIntermediateCells(from, rule, k).every(coord => (
        !isIntermediateCellBlocking(coord, figuresByCoord, actorPlacement, catalog, canJumpOverOwnTeam)
    ))
}

function isIntermediateCellBlocking(
    coord: CellCoord,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement?: FigurePlacement,
    catalog?: FigureCatalog,
    canJumpOverOwnTeam?: boolean,
): boolean {
    if (!isStackOccupied({ figuresByCoord, tray: [] }, coord)) {
        return false
    }

    const occupant = getTopOfStack({ figuresByCoord, tray: [] }, coord)

    if (!occupant) {
        return false
    }

    if (actorPlacement && occupant.instanceId === actorPlacement.instanceId) {
        return false
    }

    if (
        canJumpOverOwnTeam
        && catalog
        && actorPlacement
        && areSameFigureTeam(catalog, actorPlacement.figureId, occupant.figureId)
    ) {
        return false
    }

    return true
}

export function resolveJumpOverPieces(state: Pick<FigureState, 'jumpOverPieces'>): boolean {
    return state.jumpOverPieces !== false
}

export function resolveCanStepOnOwnTeam(state: Pick<FigureState, 'canStepOnOwnTeam'>): boolean {
    return state.canStepOnOwnTeam === true
}

export function resolveCanJumpOverOwnTeam(state: Pick<FigureState, 'canJumpOverOwnTeam'>): boolean {
    return state.canJumpOverOwnTeam === true
}

export function resolveMoveRuleLanding(landing: FigureMoveRuleLanding | undefined): FigureMoveRuleLanding {
    return landing ?? 'any'
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

export function orientMoveRule(rule: FigureMoveRule, direction: FigureMoveDirection): FigureMoveRule {
    const rotated = rotateMoveVector(rule.x, rule.y, direction)

    return {
        ...rule,
        x: rotated.x,
        y: rotated.y,
    }
}

function isLandingOnOwnTeamBlocked(
    to: CellCoord,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement: FigurePlacement | undefined,
    canStepOnOwnTeam: boolean,
    catalog: FigureCatalog | undefined,
): boolean {
    if (canStepOnOwnTeam || !catalog || !actorPlacement) {
        return false
    }

    const targetAtTo = getTopOfStack({ figuresByCoord, tray: [] }, to)

    if (!targetAtTo || targetAtTo.instanceId === actorPlacement.instanceId) {
        return false
    }

    return areSameFigureTeam(catalog, actorPlacement.figureId, targetAtTo.figureId)
}

function satisfiesMoveRuleLanding(
    rule: FigureMoveRule,
    to: CellCoord,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    actorPlacement: FigurePlacement | undefined,
    canStepOnOwnTeam: boolean,
    catalog: FigureCatalog | undefined,
): boolean {
    const landing = resolveMoveRuleLanding(rule.landing)
    const targetAtTo = getTopOfStack({ figuresByCoord, tray: [] }, to)
    const occupied = Boolean(
        targetAtTo
        && (!actorPlacement || targetAtTo.instanceId !== actorPlacement.instanceId),
    )

    if (landing === 'empty') {
        return !occupied
    }

    if (landing === 'jumpOver') {
        return !occupied
    }

    if (landing === 'capture') {
        if (!occupied) {
            return false
        }

        if (!catalog || !actorPlacement) {
            return true
        }

        return !areSameFigureTeam(catalog, actorPlacement.figureId, targetAtTo!.figureId)
    }

    if (occupied) {
        return !isLandingOnOwnTeamBlocked(to, figuresByCoord, actorPlacement, canStepOnOwnTeam, catalog)
    }

    return true
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
    const canStepOnOwnTeam = resolveCanStepOnOwnTeam(playState)
    const canJumpOverOwnTeam = resolveCanJumpOverOwnTeam(playState)

    if (freeMove || moveRules.length === 0) {
        if (isLandingOnOwnTeamBlocked(to, figuresByCoord, actorPlacement, canStepOnOwnTeam, catalog)) {
            return false
        }

        return true
    }

    const delta = getMoveDelta(from, to)
    const jumpOverPieces = resolveJumpOverPieces(playState)
    const moveDirection = catalog
        ? resolveFigureMoveDirectionFromCatalog(catalog, definition.id, figureTeams)
        : 'up'

    for (const rule of moveRules) {
        const orientedRule = orientMoveRule(rule, moveDirection)
        const k = matchMoveRule(delta, orientedRule)

        if (k === null) {
            continue
        }

        const landing = resolveMoveRuleLanding(rule.landing)

        if (landing === 'jumpOver') {
            if (!satisfiesJumpOverPath(
                from,
                orientedRule,
                k,
                figuresByCoord,
                actorPlacement,
                catalog,
                canJumpOverOwnTeam,
            )) {
                continue
            }
        } else if (!isIntermediatePathClear(
            from,
            orientedRule,
            k,
            figuresByCoord,
            jumpOverPieces,
            actorPlacement,
            catalog,
            canJumpOverOwnTeam,
        )) {
            continue
        }

        if (!satisfiesMoveRuleLanding(rule, to, figuresByCoord, actorPlacement, canStepOnOwnTeam, catalog)) {
            continue
        }

        return true
    }

    return false
}

export function collectHoppedFigures(
    from: CellCoord,
    to: CellCoord,
    moveRules: FigureMoveRule[],
    jumpOverPieces: boolean,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    moveDirection: FigureMoveDirection = 'up',
): FigurePlacement[] {
    const delta = getMoveDelta(from, to)

    for (const rule of moveRules) {
        const orientedRule = orientMoveRule(rule, moveDirection)
        const k = matchMoveRule(delta, orientedRule)

        if (k === null) {
            continue
        }

        const landing = resolveMoveRuleLanding(rule.landing)

        if (landing !== 'jumpOver' && !jumpOverPieces) {
            continue
        }

        const hopped: FigurePlacement[] = []

        for (const coord of collectIntermediateCells(from, orientedRule, k)) {
            const stack = figuresByCoord[coordKey(coord)] ?? []
            const top = stack[stack.length - 1]

            if (top) {
                hopped.push(top)
            }
        }

        return hopped
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

    const jumpOverPieces = resolveJumpOverPieces(playState)
    const canJumpOverOwnTeam = resolveCanJumpOverOwnTeam(playState)
    const moveDirection = catalog
        ? resolveFigureMoveDirectionFromCatalog(catalog, definition.id, figureTeams)
        : 'up'

    for (const rule of moveRules) {
        const orientedRule = orientMoveRule(rule, moveDirection)
        const resolvedN = orientedRule.n === undefined ? 1 : orientedRule.n

        if (resolvedN === 0) {
            for (let k = 1; ; k += 1) {
                const coord = getCoordAlongRule(from, orientedRule, k)

                if (!isCoordInGrid(coord, n, m)) {
                    break
                }

                if (!isIntermediatePathClear(
                    from,
                    orientedRule,
                    k,
                    figuresByCoord,
                    jumpOverPieces,
                    actorPlacement,
                    catalog,
                    canJumpOverOwnTeam,
                )) {
                    break
                }

                addDestination(coord)

                if (!jumpOverPieces && isStackOccupied({ figuresByCoord, tray: [] }, coord)) {
                    break
                }
            }

            continue
        }

        for (let k = 1; k <= resolvedN; k += 1) {
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
