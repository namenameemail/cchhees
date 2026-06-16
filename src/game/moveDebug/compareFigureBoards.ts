import { coordKey } from '../types/coords'
import { FigureId, FigurePlacement } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import { resolvePlacementStateIndex } from '../figureView'

export type FigureBoardMismatchKind = 'missing' | 'extra' | 'wrongFigure' | 'wrongState' | 'wrongStackSize'

export interface FigureBoardMismatch {
    kind: FigureBoardMismatchKind
    coord: string
    stackIndex?: number
    figureId?: FigureId
    expectedFigureId?: FigureId
    actualFigureId?: FigureId
    expectedStateIndex?: number
    actualStateIndex?: number
}

export interface FigureBoardCompareResult {
    match: boolean
    mismatches: FigureBoardMismatch[]
}

function stackSignature(stack: FigurePlacement[]): string {
    return stack
        .map(placement => `${placement.figureId}#${resolvePlacementStateIndex(placement)}`)
        .join('|')
}

function collectCoordKeys(figures: FiguresSlice): Set<string> {
    return new Set(Object.keys(figures.figuresByCoord))
}

export function compareFigureBoards(
    actual: FiguresSlice,
    expected: FiguresSlice,
): FigureBoardCompareResult {
    const allCoords = new Set([
        ...collectCoordKeys(actual),
        ...collectCoordKeys(expected),
    ])
    const mismatches: FigureBoardMismatch[] = []

    for (const key of [...allCoords].sort()) {
        const expectedStack = expected.figuresByCoord[key] ?? []
        const actualStack = actual.figuresByCoord[key] ?? []

        if (expectedStack.length === 0 && actualStack.length > 0) {
            for (const [index, placement] of actualStack.entries()) {
                mismatches.push({
                    kind: 'extra',
                    coord: key,
                    stackIndex: index,
                    figureId: placement.figureId,
                    actualFigureId: placement.figureId,
                    actualStateIndex: resolvePlacementStateIndex(placement),
                })
            }
            continue
        }

        if (expectedStack.length > 0 && actualStack.length === 0) {
            for (const [index, placement] of expectedStack.entries()) {
                mismatches.push({
                    kind: 'missing',
                    coord: key,
                    stackIndex: index,
                    figureId: placement.figureId,
                    expectedFigureId: placement.figureId,
                    expectedStateIndex: resolvePlacementStateIndex(placement),
                })
            }
            continue
        }

        if (stackSignature(expectedStack) === stackSignature(actualStack)) {
            continue
        }

        const maxLength = Math.max(expectedStack.length, actualStack.length)

        for (let index = 0; index < maxLength; index += 1) {
            const expectedPlacement = expectedStack[index]
            const actualPlacement = actualStack[index]

            if (expectedPlacement && !actualPlacement) {
                mismatches.push({
                    kind: 'missing',
                    coord: key,
                    stackIndex: index,
                    figureId: expectedPlacement.figureId,
                    expectedFigureId: expectedPlacement.figureId,
                    expectedStateIndex: resolvePlacementStateIndex(expectedPlacement),
                })
                continue
            }

            if (!expectedPlacement && actualPlacement) {
                mismatches.push({
                    kind: 'extra',
                    coord: key,
                    stackIndex: index,
                    figureId: actualPlacement.figureId,
                    actualFigureId: actualPlacement.figureId,
                    actualStateIndex: resolvePlacementStateIndex(actualPlacement),
                })
                continue
            }

            if (!expectedPlacement || !actualPlacement) {
                continue
            }

            if (expectedPlacement.figureId !== actualPlacement.figureId) {
                mismatches.push({
                    kind: 'wrongFigure',
                    coord: key,
                    stackIndex: index,
                    expectedFigureId: expectedPlacement.figureId,
                    actualFigureId: actualPlacement.figureId,
                    expectedStateIndex: resolvePlacementStateIndex(expectedPlacement),
                    actualStateIndex: resolvePlacementStateIndex(actualPlacement),
                })
                continue
            }

            const expectedState = resolvePlacementStateIndex(expectedPlacement)
            const actualState = resolvePlacementStateIndex(actualPlacement)

            if (expectedState !== actualState) {
                mismatches.push({
                    kind: 'wrongState',
                    coord: key,
                    stackIndex: index,
                    figureId: expectedPlacement.figureId,
                    expectedStateIndex: expectedState,
                    actualStateIndex: actualState,
                })
            }
        }
    }

    return {
        match: mismatches.length === 0,
        mismatches,
    }
}

export function formatFigureBoardMismatch(mismatch: FigureBoardMismatch): string {
    const stackLabel = mismatch.stackIndex !== undefined ? `[${mismatch.stackIndex}]` : ''

    switch (mismatch.kind) {
        case 'missing':
            return `missing ${mismatch.expectedFigureId}#${mismatch.expectedStateIndex} @ ${mismatch.coord}${stackLabel}`
        case 'extra':
            return `extra ${mismatch.actualFigureId}#${mismatch.actualStateIndex} @ ${mismatch.coord}${stackLabel}`
        case 'wrongFigure':
            return `wrongFigure @ ${mismatch.coord}${stackLabel}: expected ${mismatch.expectedFigureId}, got ${mismatch.actualFigureId}`
        case 'wrongState':
            return `wrongState ${mismatch.figureId} @ ${mismatch.coord}${stackLabel}: expected #${mismatch.expectedStateIndex}, got #${mismatch.actualStateIndex}`
        case 'wrongStackSize':
            return `wrongStackSize @ ${mismatch.coord}`
        default:
            return mismatch.coord
    }
}

export function emptyFiguresSlice(): FiguresSlice {
    return {
        figuresByCoord: {},
        tray: [],
    }
}

export function coordKeyFromParts(i: number, j: number): string {
    return coordKey({ i, j })
}
