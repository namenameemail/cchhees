import { BoardParameters } from '../game/types/boardParameters'
import { getBoardPixelSize } from '../game/boardAxisLabels'

export function getBoardPreviewBoxStyle(
    parameters: BoardParameters,
    maxSize = 96,
): { width: number; height: number } {
    const { width, height } = getBoardPixelSize(parameters)

    if (width <= 0 || height <= 0) {
        return { width: maxSize, height: maxSize }
    }

    const scale = maxSize / Math.max(width, height)

    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    }
}
