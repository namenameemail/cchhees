import { CellParameters, CellShape } from '../../game/types/cells'
import { getLegacySvgInlineFile, migrateCellParameters } from '../../game/cellImageShape'
import { GameState } from '../../game/types/gameState'
import { putAsset } from '../db'

function isInlineDataUrl(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith('data:')
}

function migrateCellParametersWithAssets(
    params: CellParameters | undefined,
    urlToAssetId: Map<string, number>,
): CellParameters | undefined {
    const migrated = migrateCellParameters(params)

    if (!migrated?.paramsByShape?.[CellShape.img]) {
        return migrated
    }

    const imgParams = migrated.paramsByShape[CellShape.img]
    const legacyFile = getLegacySvgInlineFile(migrated)

    if (!isInlineDataUrl(legacyFile)) {
        return migrated
    }

    const assetId = urlToAssetId.get(legacyFile)

    if (assetId == null) {
        return migrated
    }

    const { file: _removed, ...restImgParams } = imgParams as { file?: string; assetId?: number | null }

    return {
        ...migrated,
        paramsByShape: {
            ...migrated.paramsByShape,
            [CellShape.img]: {
                ...restImgParams,
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
        const file = getLegacySvgInlineFile(cell.parameters)
        if (isInlineDataUrl(file)) {
            uniqueUrls.add(file)
        }
    }

    for (const condition of gameState.boardConditions) {
        const file = getLegacySvgInlineFile(condition.cellParams)
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
            parameters: migrateCellParametersWithAssets(cell.parameters, urlToAssetId),
        })),
        boardConditions: gameState.boardConditions.map(condition => ({
            ...condition,
            cellParams: migrateCellParametersWithAssets(condition.cellParams, urlToAssetId)
                ?? condition.cellParams,
        })),
    }

    return { gameState: nextState, migrated: true }
}
