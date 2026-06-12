import { putAssetWithId, putProject } from '../projects/db'
import {
    remapAssetIdsInProjectPersist,
} from '../projects/assetIdRemap'
import { collectReferencedAssetIds } from '../projects/assets/assetReferences'
import { normalizeLoadedProject, Project } from '../projects/types'
import { ProjectFileAsset } from '../projects/projectFile'
import { CollabSnapshot } from './types'
import { normalizeCollabPersistData } from './normalizePersistData'

function findMissingAssetMappings(
    data: ReturnType<typeof normalizeCollabPersistData>,
    idMap: ReadonlyMap<number, number>,
): number[] {
    const referenced = collectReferencedAssetIds(data)
    const missing: number[] = []

    for (const id of referenced) {
        if (!idMap.has(id)) {
            missing.push(id)
        }
    }

    return missing.sort((left, right) => left - right)
}

function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }

    return new Blob([bytes], { type: mimeType })
}

function resolveImportName(name: string, existingProjects: Project[]): string {
    const existingNames = new Set(existingProjects.map(project => project.name))

    if (!existingNames.has(name)) {
        return name
    }

    let suffix = 2

    while (existingNames.has(`${name} (${suffix})`)) {
        suffix += 1
    }

    return `${name} (${suffix})`
}

async function importAssets(
    projectId: string,
    assets: ProjectFileAsset[],
): Promise<Map<number, number>> {
    const idMap = new Map<number, number>()

    for (const asset of assets) {
        if (typeof asset.id !== 'number' || typeof asset.data !== 'string') {
            continue
        }

        const blob = base64ToBlob(asset.data, asset.mimeType || 'application/octet-stream')
        const newId = await putAssetWithId(asset.id, {
            projectId,
            name: asset.name,
            mimeType: asset.mimeType || blob.type || 'application/octet-stream',
            blob,
            size: blob.size,
        })

        idMap.set(asset.id, newId)
    }

    return idMap
}

export async function importCollabSnapshot(
    snapshot: CollabSnapshot,
    _roomId: string,
    existingProjects: Project[],
): Promise<Project> {
    const persistData = normalizeCollabPersistData(snapshot.data)
    const migrated = normalizeLoadedProject({
        id: 'collab',
        name: snapshot.projectName,
        updatedAt: Date.now(),
        figureCatalog: persistData.figureCatalog,
        catalogHistory: persistData.catalogHistory,
        boards: persistData.boards,
        activeBoardId: persistData.activeBoardId,
    })

    const projectId = crypto.randomUUID()
    const idMap = await importAssets(projectId, snapshot.assets ?? [])

    const missingAssetIds = findMissingAssetMappings(persistData, idMap)

    if (missingAssetIds.length > 0) {
        const exportedIds = [...idMap.keys()].sort((left, right) => left - right)
        throw new Error(
            `Не хватает ассетов для импорта: ${missingAssetIds.join(', ')}`
            + ` (в snapshot: ${exportedIds.join(', ') || 'нет'})`,
        )
    }

    const remapped = remapAssetIdsInProjectPersist(persistData, idMap)

    const project: Project = {
        ...migrated,
        id: projectId,
        name: resolveImportName(snapshot.projectName.trim() || 'Проект', existingProjects),
        updatedAt: Date.now(),
        figureCatalog: remapped.figureCatalog,
        catalogHistory: remapped.catalogHistory,
        boards: remapped.boards,
        activeBoardId: remapped.activeBoardId,
    }

    await putProject(project)

    return project
}
