import { cloneFiguresSlice } from '../game/state/reconcile'
import { FiguresSlice } from '../game/state/slices'
import { resolvePlacementStateIndex } from '../game/figureView'
import { compareFigureBoards } from '../game/moveDebug/compareFigureBoards'
import { BoardDocument } from './types'

export function emptyFiguresSlice(): FiguresSlice {
    return {
        figuresByCoord: {},
        tray: [],
    }
}

function traySignature(tray: FiguresSlice['tray']): string {
    return tray
        .map(placement => `${placement.figureId}#${resolvePlacementStateIndex(placement)}`)
        .join('|')
}

export function compareFiguresSlices(actual: FiguresSlice, expected: FiguresSlice): boolean {
    const boardMatch = compareFigureBoards(actual, expected).match
    const trayMatch = traySignature(actual.tray) === traySignature(expected.tray)

    return boardMatch && trayMatch
}

export function getBoardDefaultFigures(board: BoardDocument): FiguresSlice {
    if (!board.defaultFigures) {
        return emptyFiguresSlice()
    }

    return cloneFiguresSlice(board.defaultFigures)
}

export function countFiguresOnBoard(slice: FiguresSlice): { onBoard: number; inTray: number } {
    let onBoard = 0

    for (const stack of Object.values(slice.figuresByCoord)) {
        onBoard += stack.length
    }

    return {
        onBoard,
        inTray: slice.tray.length,
    }
}
