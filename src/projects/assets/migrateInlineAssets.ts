import { CellParameters, CellShape } from '../../game/types/cells'
import { GameState } from '../../game/types/gameState'
import { putAsset } from '../db'

function isInlineDataUrl(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith('data:')
}

function migrateCellParameters(
    params: CellParameters | undefined,
    urlToAssetId: Map<string, number>,
): CellParameters | undefined {
    if (!params?.paramsByShape?.[CellShape.svg]) {
        return params
    }

    const svgParams = params.paramsByShape[CellShape.svg]
    const legacyFile = (svgParams as { file?: string }).file

    if (!isInlineDataUrl(legacyFile)) {
        if (svgParams.assetId != null || !legacyFile) {
            return params
        }
        return params
    }

    const assetId = urlToAssetId.get(legacyFile)
    if (assetId == null) {
        return params
    }

    const { file: _removed, ...restSvgParams } = svgParams as { file?: string; assetId?: number | null }

    return {
        ...params,
        paramsByShape: {
            ...params.paramsByShape,
            [CellShape.svg]: {
                ...restSvgParams,
                assetId,
            },
        },
    }
}

async function createAssetFromDataUrl(
    projectId: string,
    dataUrl: string,
    index: number,
): Promise<number> {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const mimeType = blob.type || 'image/svg+xml'

    return putAsset({
        projectId,
        name: `migrated-${index + 1}.${mimeType.includes('svg') ? 'svg' : 'img'}`,
        mimeType,
        blob,
        size: blob.size,
    })
}

export async function migrateInlineAssets(
    projectId: string,
    gameState: GameState,
): Promise<{ gameState: GameState; migrated: boolean }> {
    const uniqueUrls = new Set<string>()

    for (const cell of gameState.cells) {
        const file = (cell.parameters?.paramsByShape?.[CellShape.svg] as { file?: string } | undefined)?.file
        if (isInlineDataUrl(file)) {
            uniqueUrls.add(file)
        }
    }

    for (const condition of gameState.boardConditions) {
        const file = (condition.cellParams?.paramsByShape?.[CellShape.svg] as { file?: string } | undefined)?.file
        if (isInlineDataUrl(file)) {
            uniqueUrls.add(file)
        }
    }

    if (uniqueUrls.size === 0) {
        return { gameState, migrated: false }
    }

    const urlToAssetId = new Map<string, number>()
    let index = 0
    for (const dataUrl of uniqueUrls) {
        const assetId = await createAssetFromDataUrl(projectId, dataUrl, index)
        urlToAssetId.set(dataUrl, assetId)
        index++
    }

    const nextState: GameState = {
        ...gameState,
        cells: gameState.cells.map(cell => ({
            ...cell,
            parameters: migrateCellParameters(cell.parameters, urlToAssetId),
        })),
        boardConditions: gameState.boardConditions.map(condition => ({
            ...condition,
            cellParams: migrateCellParameters(condition.cellParams, urlToAssetId) ?? condition.cellParams,
        })),
    }

    return { gameState: nextState, migrated: true }
}
