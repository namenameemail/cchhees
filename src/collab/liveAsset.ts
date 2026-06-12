import { putProjectAsset, PutProjectAssetResult } from '../projects/db'
import { ProjectFileAsset } from '../projects/projectFile'

function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }

    return new Blob([bytes], { type: mimeType })
}

export async function importLiveAsset(
    projectId: string,
    asset: ProjectFileAsset,
): Promise<PutProjectAssetResult> {
    if (typeof asset.id !== 'number' || typeof asset.data !== 'string') {
        throw new Error('Invalid live asset payload')
    }

    const blob = base64ToBlob(asset.data, asset.mimeType || 'application/octet-stream')

    return putProjectAsset(asset.id, {
        projectId,
        name: asset.name,
        mimeType: asset.mimeType || blob.type || 'application/octet-stream',
        blob,
        size: blob.size,
    })
}
