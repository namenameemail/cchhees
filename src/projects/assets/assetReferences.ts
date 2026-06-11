import { CellParameters, CellShape, CellImageShapeParams } from '../../game/types/cells'
import { getCellImageShapeParams } from '../../game/cellImageShape'
import { GameState } from '../../game/types/gameState'
import { FigureDisplayType, FigureViewParams } from '../../game/types/figures'

function getCellImageAssetId(params?: CellParameters): number | null | undefined {
    return getCellImageShapeParams(params)?.assetId
}

function getFigureImageAssetId(params?: FigureViewParams): number | null | undefined {
    if (params?.displayType !== FigureDisplayType.image) {
        return undefined
    }
    return params.assetId
}

function getFigureFontAssetId(params?: FigureViewParams): number | null | undefined {
    return params?.fontAssetId
}

function countFigureAssetReferences(params: FigureViewParams | undefined, assetId: number): number {
    let count = 0

    if (getFigureImageAssetId(params) === assetId) {
        count++
    }

    if (getFigureFontAssetId(params) === assetId) {
        count++
    }

    return count
}

export function countAssetReferences(gameState: GameState, assetId: number): number {
    let count = 0

    for (const cell of gameState.cells) {
        if (getCellImageAssetId(cell.parameters) === assetId) {
            count++
        }
    }

    for (const condition of gameState.boardConditions) {
        if (getCellImageAssetId(condition.cellParams) === assetId) {
            count++
        }
    }

    if (gameState.figureCatalog) {
        for (const entry of gameState.figureCatalog) {
            count += countFigureAssetReferences(entry.viewParams, assetId)
        }
    } else if (gameState.figureDefinitions) {
        for (const params of Object.values(gameState.figureDefinitions)) {
            count += countFigureAssetReferences(params, assetId)
        }
    }

    return count
}

export function clearAssetIdFromCellParameters(
    params: CellParameters | undefined,
    assetId: number,
): CellParameters | undefined {
    if (!params?.paramsByShape) {
        return params
    }

    let changed = false
    const nextParamsByShape = { ...params.paramsByShape }

    for (const shape of [CellShape.img] as const) {
        const shapeParams = params.paramsByShape[shape] as CellImageShapeParams | undefined

        if (!shapeParams || shapeParams.assetId !== assetId) {
            continue
        }

        nextParamsByShape[shape] = {
            ...shapeParams,
            assetId: null,
        }
        changed = true
    }

    if (!changed) {
        return params
    }

    return {
        ...params,
        paramsByShape: nextParamsByShape,
    }
}

export function clearAssetIdFromFigureViewParams(
    params: FigureViewParams | undefined,
    assetId: number,
): FigureViewParams | undefined {
    if (!params) {
        return params
    }

    let changed = false
    const nextParams = { ...params }

    if (params.displayType === FigureDisplayType.image && params.assetId === assetId) {
        nextParams.assetId = null
        changed = true
    }

    if (params.fontAssetId === assetId) {
        nextParams.fontAssetId = null
        changed = true
    }

    return changed ? nextParams : params
}
