import {
    getAssetsByProjectId,
    putAsset,
    putProject,
} from '../db'
import { createEmptyProject } from '../createProject'
import {
    remapAssetIdsInProjectPersist,
} from '../assetIdRemap'
import { Project, projectToPersistData } from '../types'
import { visitedRoomAsProject } from '../projectPersist'
import { VisitedRoom } from './types'

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

async function duplicateProjectAssets(
    fromProjectId: string,
    toProjectId: string,
): Promise<Map<number, number>> {
    const assets = await getAssetsByProjectId(fromProjectId)
    const idMap = new Map<number, number>()

    for (const asset of assets) {
        const newId = await putAsset({
            projectId: toProjectId,
            name: asset.name,
            mimeType: asset.mimeType,
            blob: asset.blob,
            size: asset.size,
        })
        idMap.set(asset.id, newId)
    }

    return idMap
}

export async function promoteVisitedRoomToLocalProject(
    room: VisitedRoom,
    existingProjects: Project[],
): Promise<Project> {
    const shell = createEmptyProject(resolveImportName(room.name, existingProjects))
    const idMap = await duplicateProjectAssets(room.localProjectId, shell.id)
    const remapped = remapAssetIdsInProjectPersist(projectToPersistData(visitedRoomAsProject(room)), idMap)

    const promoted: Project = {
        ...shell,
        figureCatalog: remapped.figureCatalog,
        figureTeams: remapped.figureTeams,
        catalogHistory: remapped.catalogHistory,
        boards: remapped.boards,
        activeBoardId: remapped.activeBoardId,
        previewDataUrl: room.previewDataUrl,
        updatedAt: Date.now(),
    }

    await putProject(promoted)

    return promoted
}
