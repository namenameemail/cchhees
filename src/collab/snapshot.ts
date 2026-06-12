import { getAssetRecord, getAssetsByProjectId } from '../projects/db'
import { collectReferencedAssetIds } from '../projects/assets/assetReferences'
import { ProjectFileAsset } from '../projects/projectFile'
import { ProjectAssetRecord } from '../projects/assets/types'
import { Project, ProjectPersistData, projectToPersistData } from '../projects/types'
import { CollabSnapshot } from './types'
import { collabWarn } from './debug'

async function assetRecordToExport(asset: ProjectAssetRecord): Promise<ProjectFileAsset> {
    const buffer = await asset.blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''

    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index])
    }

    return {
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        data: btoa(binary),
    }
}

export async function resolveCollabExportAssets(
    data: ProjectPersistData,
    projectId: string,
): Promise<ProjectFileAsset[]> {
    const referencedIds = collectReferencedAssetIds(data)
    const projectAssets = await getAssetsByProjectId(projectId)
    const recordsById = new Map<number, ProjectAssetRecord>()

    for (const asset of projectAssets) {
        recordsById.set(asset.id, asset)
    }

    for (const id of referencedIds) {
        if (recordsById.has(id)) {
            continue
        }

        const record = await getAssetRecord(id)

        if (record) {
            recordsById.set(id, record)
            continue
        }

        collabWarn('snapshot: referenced asset missing from storage', id)
    }

    const exportIds = new Set<number>(projectAssets.map(asset => asset.id))

    for (const id of referencedIds) {
        if (recordsById.has(id)) {
            exportIds.add(id)
        }
    }

    return Promise.all(
        [...exportIds]
            .sort((left, right) => left - right)
            .map(id => assetRecordToExport(recordsById.get(id)!)),
    )
}

export async function exportAssetById(assetId: number): Promise<ProjectFileAsset | null> {
    const record = await getAssetRecord(assetId)

    if (!record) {
        return null
    }

    return assetRecordToExport(record)
}

export async function buildCollabSnapshot(project: Project, revision: number): Promise<CollabSnapshot> {
    const data = projectToPersistData(project)

    return {
        revision,
        projectName: project.name,
        hostProjectId: project.id,
        data,
        assets: await resolveCollabExportAssets(data, project.id),
    }
}

export async function buildCollabSnapshotFromPersist(
    projectName: string,
    revision: number,
    data: ProjectPersistData,
    hostProjectId: string,
): Promise<CollabSnapshot> {
    return {
        revision,
        projectName,
        hostProjectId,
        data,
        assets: await resolveCollabExportAssets(data, hostProjectId),
    }
}
