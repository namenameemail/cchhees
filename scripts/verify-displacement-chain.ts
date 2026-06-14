import { applyFigureMove } from '../src/game/events/applyFigureMove'
import {
    createFigurePlacement,
    normalizeFigurePlacement,
    placementsMatch,
} from '../src/game/figureView'
import { normalizeFiguresSlice } from '../src/game/state/slices'
import { FigureEventType, GameActionType } from '../src/game/types/events'
import { FigurePlacement } from '../src/game/types/figures'
import { coordKey } from '../src/game/types/coords'

const board = { n: 8, m: 8 }
const queen = createFigurePlacement('ChessQueenBlack')
const pawn = createFigurePlacement('ChessPawnWhite')

function atCoord(
    figures: { figuresByCoord: Record<string, FigurePlacement> },
    i: number,
    j: number,
) {
    return figures.figuresByCoord[coordKey({ i, j })]?.figureId ?? null
}

function assertUniqueInstanceIds(
    placements: FigurePlacement[],
    label: string,
    errors: string[],
): void {
    const ids = placements.map(p => p.instanceId)
    const unique = new Set(ids)

    if (unique.size !== ids.length) {
        errors.push(`${label}: duplicate instanceId among ${ids.length} placements`)
    }

    if (ids.some(id => !id || id.length < 8)) {
        errors.push(`${label}: missing or invalid instanceId`)
    }
}

const figures = {
    figuresByCoord: {
        [coordKey({ i: 2, j: 1 })]: queen,
        [coordKey({ i: 2, j: 2 })]: pawn,
        [coordKey({ i: 3, j: 3 })]: createFigurePlacement('ChessQueenBlack'),
        [coordKey({ i: 0, j: 0 })]: createFigurePlacement('ChessPawnWhite'),
        [coordKey({ i: 7, j: 7 })]: createFigurePlacement('ChessPawnWhite'),
    },
    tray: [],
}

const catalog = [
    {
        id: 'ChessPawnWhite',
        states: [{ viewParams: {} }],
        eventRules: [{
            id: 'pawn-displace',
            type: FigureEventType.steppedOnBy,
            params: { cause: 'any' },
            actions: [{
                type: GameActionType.displaceFigure,
                params: { dx: 1, dy: 1 },
            }],
        }],
    },
    {
        id: 'ChessQueenBlack',
        states: [{ viewParams: {} }],
        eventRules: [],
    },
]

const result = applyFigureMove(figures, {
    from: { i: 2, j: 1 },
    to: { i: 2, j: 2 },
    actorPlacement: queen,
    targetAtTo: pawn,
    swapOnEat: false,
    boardParameters: board,
    catalog,
})

const at = (i: number, j: number) => atCoord(result, i, j)
const errors: string[] = []

if (at(2, 2) !== 'ChessQueenBlack') {
    errors.push('moving queen should be at (2,2)')
}

if (at(3, 3) !== 'ChessPawnWhite') {
    errors.push('pawn should land at (3,3)')
}

if (result.tray.length !== 1 || result.tray[0].figureId !== 'ChessQueenBlack') {
    errors.push('blocked queen should be in tray')
}

if (at(0, 0) !== 'ChessPawnWhite' || at(7, 7) !== 'ChessPawnWhite') {
    errors.push('other pawns on board should remain')
}

const pawnCount = Object.values(result.figuresByCoord).filter(p => p.figureId === 'ChessPawnWhite').length
if (pawnCount !== 3) {
    errors.push(`expected 3 pawns on board, got ${pawnCount}`)
}

const boardPawns = Object.values(result.figuresByCoord).filter(p => p.figureId === 'ChessPawnWhite')
assertUniqueInstanceIds(boardPawns, 'board pawns after queen move', errors)

if (errors.length > 0) {
    console.error('FAIL:', errors.join('; '))
    console.error('board:', result.figuresByCoord, 'tray:', result.tray)
    process.exit(1)
}

console.log('OK displacement chain: queen@(2,2), pawn@(3,3), queen in tray')

const pawn2 = createFigurePlacement('ChessPawnWhite')
const queen2 = createFigurePlacement('ChessQueenBlack')
const figures2 = {
    figuresByCoord: {
        [coordKey({ i: 4, j: 3 })]: queen2,
        [coordKey({ i: 5, j: 4 })]: pawn,
        [coordKey({ i: 6, j: 5 })]: pawn2,
    },
    tray: [],
}

const result2 = applyFigureMove(figures2, {
    from: { i: 4, j: 3 },
    to: { i: 5, j: 4 },
    actorPlacement: queen2,
    targetAtTo: pawn,
    swapOnEat: false,
    boardParameters: board,
    catalog,
})

const errors2: string[] = []
if (atCoord(result2, 5, 4) !== 'ChessQueenBlack') {
    errors2.push('queen should be at (5,4)')
}
if (atCoord(result2, 6, 5) !== 'ChessPawnWhite') {
    errors2.push('first pawn should land at (6,5)')
}
if (atCoord(result2, 7, 6) !== 'ChessPawnWhite') {
    errors2.push('second pawn should chain-displace to (7,6)')
}

const chainPawns = Object.values(result2.figuresByCoord).filter(p => p.figureId === 'ChessPawnWhite')
assertUniqueInstanceIds(chainPawns, 'pawn chain board', errors2)

if (errors2.length > 0) {
    console.error('FAIL pawn chain:', errors2.join('; '))
    console.error('board:', Object.fromEntries(
        Object.entries(result2.figuresByCoord).map(([k, v]) => [k, v.figureId]),
    ))
    console.error('tray:', result2.tray.map(t => t.figureId))
    process.exit(1)
}

console.log('OK pawn-on-pawn chain: pawns at (6,5) and (7,6)')

const legacyNormalized = normalizeFiguresSlice({
    figuresByCoord: {
        [coordKey({ i: 0, j: 0 })]: { figureId: 'ChessPawnWhite' },
        [coordKey({ i: 1, j: 1 })]: { figureId: 'ChessPawnWhite' },
    },
    tray: [
        { figureId: 'ChessPawnWhite' },
        { figureId: 'ChessQueenBlack' },
    ],
})

const legacyErrors: string[] = []
const allLegacy = [
    ...Object.values(legacyNormalized.figuresByCoord),
    ...legacyNormalized.tray,
]

assertUniqueInstanceIds(allLegacy, 'legacy normalize', legacyErrors)

for (const placement of allLegacy) {
    if (!placement.instanceId) {
        legacyErrors.push('legacy placement missing instanceId after normalize')
    }
}

if (legacyErrors.length > 0) {
    console.error('FAIL legacy normalize:', legacyErrors.join('; '))
    process.exit(1)
}

console.log('OK legacy placements receive unique instanceIds on normalize')

const trayDedup = normalizeFiguresSlice({
    figuresByCoord: {},
    tray: [
        normalizeFigurePlacement({ figureId: 'ChessPawnWhite', instanceId: 'aaa-111' }),
        normalizeFigurePlacement({ figureId: 'ChessPawnWhite', instanceId: 'bbb-222' }),
    ],
})

if (trayDedup.tray.length !== 2 || placementsMatch(trayDedup.tray[0], trayDedup.tray[1])) {
    console.error('FAIL tray: same-type tray entries must keep distinct instanceIds')
    process.exit(1)
}

console.log('OK tray keeps distinct instanceIds for same figure type')
