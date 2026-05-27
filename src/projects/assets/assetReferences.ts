import { CellParameters, CellShape } from '../../game/types/cells'
import { GameState } from '../../game/types/gameState'

function getSvgAssetId(params?: CellParameters): number | null | undefined {
    return params?.paramsByShape?.[CellShape.svg]?.assetId
}

export function countAssetReferences(gameState: GameState, assetId: number): number {
    let count = 0

    for (const cell of gameState.cells) {
        if (getSvgAssetId(cell.parameters) === assetId) {
            count++
        }
    }

    for (const condition of gameState.boardConditions) {
        if (getSvgAssetId(condition.cellParams) === assetId) {
            count++
        }
    }

    return count
}

export function clearAssetIdFromCellParameters(
    params: CellParameters | undefined,
    assetId: number,
): CellParameters | undefined {
    if (!params?.paramsByShape?.[CellShape.svg]) {
        return params
    }

    const svgParams = params.paramsByShape[CellShape.svg]
    if (svgParams.assetId !== assetId) {
        return params
    }

    return {
        ...params,
        paramsByShape: {
            ...params.paramsByShape,
            [CellShape.svg]: {
                ...svgParams,
                assetId: null,
            },
        },
    }
}
