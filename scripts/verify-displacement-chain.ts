import { applyFigureMove } from '../src/game/events/applyFigureMove'
import {
    createFigurePlacement,
    normalizeFigurePlacement,
    placementsMatch,
} from '../src/game/figureView'
import { getTopOfStack } from '../src/game/figureStack'
import { normalizeFiguresSlice } from '../src/game/state/slices'
import { FigureEventType, GameActionType } from '../src/game/types/events'
import { FigurePlacement } from '../src/game/types/figures'
import { coordKey } from '../src/game/types/coords'
import { FiguresSlice } from '../src/game/state/slices'

const board = { n: 8, m: 8 }

function stack(figures: Record<string, FigurePlacement | FigurePlacement[]>): FiguresSlice {
    return normalizeFiguresSlice({
        figuresByCoord: figures,
        tray: [],
    })
}

function topAt(figures: FiguresSlice, i: number, j: number): FigurePlacement | undefined {
    return getTopOfStack(figures, { i, j })
}

function topFigureId(figures: FiguresSlice, i: number, j: number): string | null {
    return topAt(figures, i, j)?.figureId ?? null
}

function allBoardPlacements(figures: FiguresSlice): FigurePlacement[] {
    return Object.values(figures.figuresByCoord).flat()
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

const queen = createFigurePlacement('ChessQueenBlack')
const pawn = createFigurePlacement('ChessPawnWhite')

const figures = stack({
    [coordKey({ i: 2, j: 1 })]: queen,
    [coordKey({ i: 2, j: 2 })]: pawn,
    [coordKey({ i: 3, j: 3 })]: createFigurePlacement('ChessQueenBlack'),
    [coordKey({ i: 0, j: 0 })]: createFigurePlacement('ChessPawnWhite'),
    [coordKey({ i: 7, j: 7 })]: createFigurePlacement('ChessPawnWhite'),
})

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

const errors: string[] = []

if (topFigureId(result, 2, 2) !== 'ChessQueenBlack') {
    errors.push('moving queen should be on top at (2,2)')
}

if (topFigureId(result, 3, 3) !== 'ChessPawnWhite') {
    errors.push('pawn should land at (3,3)')
}

if (result.tray.length !== 1 || result.tray[0].figureId !== 'ChessQueenBlack') {
    errors.push('blocked queen should be in tray')
}

if (topFigureId(result, 0, 0) !== 'ChessPawnWhite' || topFigureId(result, 7, 7) !== 'ChessPawnWhite') {
    errors.push('other pawns on board should remain')
}

const pawnCount = allBoardPlacements(result).filter(p => p.figureId === 'ChessPawnWhite').length
if (pawnCount !== 3) {
    errors.push(`expected 3 pawns on board, got ${pawnCount}`)
}

assertUniqueInstanceIds(allBoardPlacements(result), 'board after queen move', errors)

if (errors.length > 0) {
    console.error('FAIL:', errors.join('; '))
    console.error('board:', result.figuresByCoord, 'tray:', result.tray)
    process.exit(1)
}

console.log('OK displacement chain: queen@(2,2), pawn@(3,3), queen in tray')

const pawn2 = createFigurePlacement('ChessPawnWhite')
const queen2 = createFigurePlacement('ChessQueenBlack')
const figures2 = stack({
    [coordKey({ i: 4, j: 3 })]: queen2,
    [coordKey({ i: 5, j: 4 })]: pawn,
    [coordKey({ i: 6, j: 5 })]: pawn2,
})

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
if (topFigureId(result2, 5, 4) !== 'ChessQueenBlack') {
    errors2.push('queen should be at (5,4)')
}
if (topFigureId(result2, 6, 5) !== 'ChessPawnWhite') {
    errors2.push('first pawn should land at (6,5)')
}
if (topFigureId(result2, 7, 6) !== 'ChessPawnWhite') {
    errors2.push('second pawn should chain-displace to (7,6)')
}

assertUniqueInstanceIds(
    allBoardPlacements(result2).filter(p => p.figureId === 'ChessPawnWhite'),
    'pawn chain board',
    errors2,
)

if (errors2.length > 0) {
    console.error('FAIL pawn chain:', errors2.join('; '))
    console.error('board:', Object.fromEntries(
        Object.entries(result2.figuresByCoord).map(([k, v]) => [k, v.map(item => item.figureId)]),
    ))
    console.error('tray:', result2.tray.map(t => t.figureId))
    process.exit(1)
}

console.log('OK pawn-on-pawn chain: pawns at (6,5) and (7,6)')

const knight = createFigurePlacement('ChessKnightBlack')
const rook = createFigurePlacement('ChessRookBlack')

const knightRookCatalog = [
    {
        id: 'ChessKnightBlack',
        states: [{ viewParams: {} }],
        eventRules: [
            {
                id: 'knight-area',
                type: FigureEventType.enterFigureArea,
                params: {
                    anchorFigures: [{ figureId: 'ChessRookBlack' }],
                    cells: [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
                    includePassive: true,
                },
                actions: [{
                    type: GameActionType.displaceFigure,
                    params: { dx: 1, dy: 0 },
                }],
            },
            {
                id: 'knight-step-on',
                type: FigureEventType.stepOnFigure,
                params: {
                    targetFigures: [{ figureId: 'ChessRookBlack' }],
                    cause: 'any',
                    stackTarget: 'all',
                },
                actions: [{
                    type: GameActionType.displaceFigure,
                    params: { dx: 1, dy: 1 },
                }],
            },
        ],
    },
    {
        id: 'ChessRookBlack',
        states: [{ viewParams: {} }],
        eventRules: [],
    },
]

const knightBoard = { n: 5, m: 5 }
const knightFigures = stack({
    [coordKey({ i: 0, j: 0 })]: knight,
    [coordKey({ i: 2, j: 2 })]: rook,
})

const knightResult = applyFigureMove(knightFigures, {
    from: { i: 0, j: 0 },
    to: { i: 1, j: 2 },
    actorPlacement: knight,
    swapOnEat: false,
    boardParameters: knightBoard,
    catalog: knightRookCatalog,
})

const knightErrors: string[] = []

assertUniqueInstanceIds(allBoardPlacements(knightResult), 'knight/rook board', knightErrors)

if (knightResult.tray.length !== 1 || knightResult.tray[0].figureId !== 'ChessRookBlack') {
    knightErrors.push(`rook should be in tray, got tray=${knightResult.tray.map(item => item.figureId).join(',')}`)
}

const knightPlacements = allBoardPlacements(knightResult).filter(item => item.instanceId === knight.instanceId)
if (knightPlacements.length !== 1) {
    knightErrors.push(`knight instance should appear once on board, got ${knightPlacements.length}`)
}

        if (topFigureId(knightResult, 3, 3) !== 'ChessKnightBlack') {
    knightErrors.push(`knight should finish at (3,3), top=${topFigureId(knightResult, 3, 3)}`)
}

if (knightErrors.length > 0) {
    console.error('FAIL knight/rook:', knightErrors.join('; '))
    console.error('board:', knightResult.figuresByCoord)
    console.error('tray:', knightResult.tray)
    process.exit(1)
}

console.log('OK knight/rook: rook in tray, knight@(3,3), no duplicate instance')

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
    ...Object.values(legacyNormalized.figuresByCoord).flat(),
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
