import { CellCoord } from '../types/coords'
import { BoardParameters } from '../types/boardParameters'
import { FigurePlacement } from '../types/figures'
import { FiguresSlice } from '../state/slices'

export interface BoardFigureEntry {
    coord: CellCoord
    placement: FigurePlacement
}

export interface FigureBoardMoveDiff {
    kind: 'move'
    instanceId: string
    placement: FigurePlacement
    fromCoord: CellCoord
    toCoord: CellCoord
}

export interface FigureBoardRemoveDiff {
    kind: 'remove'
    instanceId: string
    placement: FigurePlacement
    fromCoord: CellCoord
}

export type FigureBoardDiffItem = FigureBoardMoveDiff | FigureBoardRemoveDiff

export interface FigureBoardDiff {
    moves: FigureBoardMoveDiff[]
    removes: FigureBoardRemoveDiff[]
}

export function coordToPixelCenter(
    coord: CellCoord,
    boardParameters: BoardParameters,
): { x: number; y: number } {
    const { cellXDistance, cellYDistance } = boardParameters

    return {
        x: coord.i * cellXDistance + cellXDistance / 2,
        y: coord.j * cellYDistance + cellYDistance / 2,
    }
}

export function buildBoardInstanceIndex(
    figuresByCoord: FiguresSlice['figuresByCoord'],
): Map<string, BoardFigureEntry> {
    const index = new Map<string, BoardFigureEntry>()

    for (const [key, stack] of Object.entries(figuresByCoord)) {
        const [i, j] = key.split(',').map(Number)

        for (const placement of stack) {
            index.set(placement.instanceId, {
                coord: { i, j },
                placement,
            })
        }
    }

    return index
}

export function diffFigureBoard(
    prev: FiguresSlice,
    next: FiguresSlice,
): FigureBoardDiff {
    const prevIndex = buildBoardInstanceIndex(prev.figuresByCoord)
    const nextIndex = buildBoardInstanceIndex(next.figuresByCoord)
    const moves: FigureBoardMoveDiff[] = []
    const removes: FigureBoardRemoveDiff[] = []

    for (const [instanceId, prevEntry] of prevIndex.entries()) {
        const nextEntry = nextIndex.get(instanceId)

        if (!nextEntry) {
            removes.push({
                kind: 'remove',
                instanceId,
                placement: prevEntry.placement,
                fromCoord: prevEntry.coord,
            })
            continue
        }

        if (prevEntry.coord.i !== nextEntry.coord.i || prevEntry.coord.j !== nextEntry.coord.j) {
            moves.push({
                kind: 'move',
                instanceId,
                placement: nextEntry.placement,
                fromCoord: prevEntry.coord,
                toCoord: nextEntry.coord,
            })
        }
    }

    return { moves, removes }
}

export function isFigureBoardDiffEmpty(diff: FigureBoardDiff): boolean {
    return diff.moves.length === 0 && diff.removes.length === 0
}
