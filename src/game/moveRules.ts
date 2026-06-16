import { BoardParameters } from './types/boardParameters'
import { CellCoord, coordKey, coordsEqual, isCoordInGrid } from './types/coords'
import { FigureDefinition, FigureId, FigurePlacement, FigureState } from './types/figures'
import { FiguresSlice } from './state/slices'
import { getTopOfStack, isStackOccupied } from './figureStack'
import {
    hasFigureMoveRules,
    normalizeFigureMoveRules,
    normalizeFigurePlacement,
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

export function isIntermediatePathClear(
    from: CellCoord,
    rule: { x: number; y: number },
    k: number,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    jumpOverPieces: boolean,
): boolean {
    if (jumpOverPieces || k <= 1) {
        return true
    }

    for (let step = 1; step < k; step += 1) {
        const coord = getCoordAlongRule(from, rule, step)
        if (isStackOccupied({ figuresByCoord, tray: [] }, coord)) {
            return false
        }
    }

    return true
}

export function resolveJumpOverPieces(state: Pick<FigureState, 'jumpOverPieces'>): boolean {
    return state.jumpOverPieces === true
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

    if (moveRules.length === 0) {
        return true
    }

    const delta = getMoveDelta(from, to)
    const jumpOverPieces = resolveJumpOverPieces(playState)

    for (const rule of moveRules) {
        const k = matchMoveRule(delta, rule)

        if (k === null) {
            continue
        }

        if (!isIntermediatePathClear(from, rule, k, figuresByCoord, jumpOverPieces)) {
            continue
        }

        return true
    }

    return false
}

export function getLegalMoveDestinations(
    from: CellCoord,
    definition: FigureDefinition,
    figuresByCoord: FiguresSlice['figuresByCoord'],
    boardParameters: BoardParameters,
    actorPlacement?: FigurePlacement,
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

        if (!isFigureMoveAllowed(from, coord, definition, figuresByCoord, boardParameters, actorPlacement)) {
            return
        }

        seen.add(key)
        destinations.push(coord)
    }

    if (moveRules.length === 0) {
        for (let j = 0; j < m; j += 1) {
            for (let i = 0; i < n; i += 1) {
                addDestination({ i, j })
            }
        }

        return destinations
    }

    const jumpOverPieces = resolveJumpOverPieces(playState)

    for (const rule of moveRules) {
        const resolvedN = rule.n === undefined ? 1 : rule.n

        if (resolvedN === 0) {
            for (let k = 1; ; k += 1) {
                const coord = getCoordAlongRule(from, rule, k)

                if (!isCoordInGrid(coord, n, m)) {
                    break
                }

                if (!isIntermediatePathClear(from, rule, k, figuresByCoord, jumpOverPieces)) {
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
            const coord = getCoordAlongRule(from, rule, k)

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
        ).map(coordKey),
    )
}

export function isUnrestrictedFigureMovement(
    definition: FigureDefinition,
    actorPlacement?: FigurePlacement,
): boolean {
    return !hasFigureMoveRules(resolvePlayStateForActor(definition, actorPlacement))
}
