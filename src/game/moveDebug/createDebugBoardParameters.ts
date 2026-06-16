import { BoardBackgroundImageFit } from '../types/boardParameters'
import { BoardParameters } from '../types/boardParameters'
import { DEFAULT_BOARD_MARKS } from '../boardMarks'

export const DEFAULT_DEBUG_BOARD_SIZE = 5
export const DEBUG_CELL_DISTANCE = 40

export function createDebugBoardParameters(
    n: number = DEFAULT_DEBUG_BOARD_SIZE,
    m: number = DEFAULT_DEBUG_BOARD_SIZE,
): BoardParameters {
    const size = Math.max(1, Math.trunc(n))
    const height = Math.max(1, Math.trunc(m))
    const cellDistance = DEBUG_CELL_DISTANCE

    return {
        n: size,
        m: height,
        cellWidth: 20,
        cellHeight: 20,
        cellXDistance: cellDistance,
        cellYDistance: cellDistance,
        swapOnEat: false,
        background: 'white',
        backgroundAssetId: null,
        backgroundImageFit: BoardBackgroundImageFit.tile,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: 'black',
        boardMarks: DEFAULT_BOARD_MARKS,
        axisNumberings: [],
        figureAnimation: {
            moveDurationMs: 250,
            fadeDurationMs: 200,
        },
    }
}

export function getDebugBoardPixelSize(boardParameters: BoardParameters): {
    width: number
    height: number
} {
    return {
        width: boardParameters.n * boardParameters.cellXDistance,
        height: boardParameters.m * boardParameters.cellYDistance,
    }
}
