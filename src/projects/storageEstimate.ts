import { getAssetsByProjectId } from './db'
import { Project } from './types'

export interface StorageEstimate {
    usage: number
    quota: number
    freeBytes: number
    freePercent: number
    usedPercent: number
}

export async function readStorageEstimate(): Promise<StorageEstimate | null> {
    if (!navigator.storage?.estimate) {
        return null
    }

    const { usage = 0, quota = 0 } = await navigator.storage.estimate()

    if (!quota) {
        return null
    }

    const freeBytes = Math.max(0, quota - usage)

    return {
        usage,
        quota,
        freeBytes,
        freePercent: (freeBytes / quota) * 100,
        usedPercent: (usage / quota) * 100,
    }
}

function estimateProjectDocumentSize(project: Project): number {
    return new Blob([JSON.stringify({
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        figureCatalog: project.figureCatalog,
        catalogHistory: project.catalogHistory,
        boards: project.boards,
        activeBoardId: project.activeBoardId,
        previewDataUrl: project.previewDataUrl,
    })]).size
}

export async function getProjectByteSize(project: Project): Promise<number> {
    const assets = await getAssetsByProjectId(project.id)
    const assetsSize = assets.reduce((sum, asset) => sum + asset.size, 0)

    return assetsSize + estimateProjectDocumentSize(project)
}
