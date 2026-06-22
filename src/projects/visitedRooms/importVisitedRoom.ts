import {
    deleteAssetsByProjectId,
    getVisitedRoom,
    putProjectAsset,
    putVisitedRoom,
} from '../db'
import {
    remapAssetIdsInProjectPersist,
} from '../assetIdRemap'
import { collectReferencedAssetIds, pruneMissingAssetReferencesInPersistData } from '../assets/assetReferences'
import { ProjectFileAsset } from '../projectFile'
import { CollabSnapshot } from '../../collab/types'
import { normalizeCollabPersistData } from '../../collab/normalizePersistData'
import { normalizeRoomId, VisitedRoom } from './types'
import { assetsDebugLog } from '../assets/assetsDebugLog'

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

async function importAssets(
    localProjectId: string,
    assets: ProjectFileAsset[],
): Promise<Map<number, number>> {
    const idMap = new Map<number, number>()

    for (const asset of assets) {
        if (typeof asset.id !== 'number' || typeof asset.data !== 'string') {
            continue
        }

        const blob = base64ToBlob(asset.data, asset.mimeType || 'application/octet-stream')
        const result = await putProjectAsset(asset.id, {
            projectId: localProjectId,
            name: asset.name,
            mimeType: asset.mimeType || blob.type || 'application/octet-stream',
            blob,
            size: blob.size,
        })

        idMap.set(asset.id, result.id)
    }

    return idMap
}

function buildHostAssetIdRemap(idMap: Map<number, number>): Record<number, number> | undefined {
    const remap: Record<number, number> = {}

    for (const [hostId, localId] of idMap) {
        if (hostId !== localId) {
            remap[hostId] = localId
        }
    }

    return Object.keys(remap).length > 0 ? remap : undefined
}

export async function importCollabSnapshotAsVisitedRoom(
    snapshot: CollabSnapshot,
    rawRoomId: string,
): Promise<VisitedRoom> {
    const hostProjectId = snapshot.hostProjectId?.trim()

    if (!hostProjectId) {
        throw new Error('Snapshot не содержит hostProjectId — обновите приложение хоста')
    }

    const lastRoomId = normalizeRoomId(rawRoomId)
    const existing = await getVisitedRoom(hostProjectId)
    const localProjectId = existing?.localProjectId ?? crypto.randomUUID()
    const now = Date.now()

    if (existing) {
        await deleteAssetsByProjectId(localProjectId)
    }

    const persistDataRaw = normalizeCollabPersistData(snapshot.data)
    const snapshotAssetIds = new Set((snapshot.assets ?? []).map(asset => asset.id))
    const persistData = pruneMissingAssetReferencesInPersistData(persistDataRaw, snapshotAssetIds)
    const idMap = await importAssets(localProjectId, snapshot.assets ?? [])
    const missingAssetIds = findMissingAssetMappings(persistData, idMap)

    if (missingAssetIds.length > 0) {
        const exportedIds = [...idMap.keys()].sort((left, right) => left - right)
        throw new Error(
            `Не хватает ассетов для импорта: ${missingAssetIds.join(', ')}`
            + ` (в snapshot: ${exportedIds.join(', ') || 'нет'})`,
        )
    }

    const remapped = remapAssetIdsInProjectPersist(persistData, idMap)

    const room: VisitedRoom = {
        hostProjectId,
        localProjectId,
        lastRoomId,
        name: snapshot.projectName.trim() || lastRoomId,
        updatedAt: now,
        lastVisitedAt: now,
        figureCatalog: remapped.figureCatalog,
        figureTeams: remapped.figureTeams,
        catalogHistory: remapped.catalogHistory,
        boards: remapped.boards,
        activeBoardId: remapped.activeBoardId,
        hostAssetIdRemap: buildHostAssetIdRemap(idMap),
        previewDataUrl: existing?.previewDataUrl,
    }

    assetsDebugLog.visitedRoomImport(
        lastRoomId,
        localProjectId,
        snapshot.assets?.length ?? 0,
        Object.fromEntries(idMap),
        hostProjectId,
    )

    await putVisitedRoom(room, { protectHostProjectId: hostProjectId })

    return room
}
