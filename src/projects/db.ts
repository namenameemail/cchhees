import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Project, MetaRecord, CURRENT_PROJECT_ID_KEY, CURRENT_PROJECT_KIND_KEY } from './types'
import { ProjectAssetNewRecord, ProjectAssetRecord } from './assets/types'
import { assetsDebugLog } from './assets/assetsDebugLog'
import { MAX_VISITED_ROOMS, ProjectSessionKind, VisitedRoom, LegacyVisitedRoomV3, migrateLegacyVisitedRoomV3, migrateVisitedRoom } from './visitedRooms/types'

export interface PutProjectAssetResult {
    id: number
    /** Host/collab id was stored under a different local id (global id collision). */
    remappedFrom?: number
}

interface CchheesDB extends DBSchema {
    projects: {
        key: string
        value: Project
    }
    meta: {
        key: string
        value: MetaRecord
    }
    assets: {
        key: number
        value: ProjectAssetRecord
        indexes: {
            'by-project': string
        }
    }
    visitedRooms: {
        key: string
        value: VisitedRoom
    }
}

const DB_NAME = 'cchhees'
const DB_VERSION = 5

let dbPromise: Promise<IDBPDatabase<CchheesDB>> | undefined

type VisitedRoomsMigrationTx = {
    objectStore(name: 'visitedRooms'): {
        getAll(): Promise<LegacyVisitedRoomV3[]>
    }
}

async function migrateVisitedRoomsToHostProjectId(
    db: IDBPDatabase<CchheesDB>,
    transaction: VisitedRoomsMigrationTx,
): Promise<void> {
    let legacy: LegacyVisitedRoomV3[] = []

    if (db.objectStoreNames.contains('visitedRooms')) {
        legacy = await transaction.objectStore('visitedRooms').getAll() as unknown as LegacyVisitedRoomV3[]
        db.deleteObjectStore('visitedRooms')
    }

    const store = db.createObjectStore('visitedRooms', { keyPath: 'hostProjectId' })

    for (const old of legacy) {
        const migrated = migrateLegacyVisitedRoomV3(old)
        await store.put(migrated)
    }
}

function getDb() {
    if (!dbPromise) {
        dbPromise = openDB<CchheesDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, _newVersion, transaction) {
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' })
                }
                if (oldVersion < 2 && !db.objectStoreNames.contains('assets')) {
                    const store = db.createObjectStore('assets', { keyPath: 'id', autoIncrement: true })
                    store.createIndex('by-project', 'projectId', { unique: false })
                }
                if (oldVersion < 3 && !db.objectStoreNames.contains('visitedRooms')) {
                    db.createObjectStore('visitedRooms', { keyPath: 'roomId' })
                }
                if (oldVersion < 4) {
                    return migrateVisitedRoomsToHostProjectId(db, transaction as unknown as VisitedRoomsMigrationTx)
                }
            },
        })
    }
    return dbPromise
}

export async function getAllProjects(): Promise<Project[]> {
    const db = await getDb()
    const projects = await db.getAll('projects')
    const sorted = projects.sort((a, b) => b.updatedAt - a.updatedAt)
    console.log(`[projects] getAllProjects: db=${DB_NAME} count=${sorted.length}`)
    return sorted
}

export async function getProject(id: string): Promise<Project | undefined> {
    const db = await getDb()
    return db.get('projects', id)
}

export async function putProject(project: Project): Promise<void> {
    const db = await getDb()
    await db.put('projects', project)
}

export async function deleteProject(id: string): Promise<void> {
    const db = await getDb()
    await db.delete('projects', id)
}

export async function getCurrentProjectId(): Promise<string | undefined> {
    const db = await getDb()
    const record = await db.get('meta', CURRENT_PROJECT_ID_KEY)
    return record?.value
}

export async function setCurrentProjectId(id: string): Promise<void> {
    const db = await getDb()
    await db.put('meta', { key: CURRENT_PROJECT_ID_KEY, value: id })
}

export async function getCurrentProjectKind(): Promise<ProjectSessionKind> {
    const db = await getDb()
    const record = await db.get('meta', CURRENT_PROJECT_KIND_KEY)

    return record?.value === 'visited' ? 'visited' : 'local'
}

export async function setCurrentProjectSession(id: string, kind: ProjectSessionKind): Promise<void> {
    const db = await getDb()

    await Promise.all([
        db.put('meta', { key: CURRENT_PROJECT_ID_KEY, value: id }),
        db.put('meta', { key: CURRENT_PROJECT_KIND_KEY, value: kind }),
    ])
}

export async function getAllVisitedRooms(): Promise<VisitedRoom[]> {
    const db = await getDb()
    const rooms = await db.getAll('visitedRooms')

    return rooms
        .map(room => {
            try {
                return migrateVisitedRoom(room)
            } catch (error) {
                console.error('[db] migrateVisitedRoom failed:', error)
                return null
            }
        })
        .filter((room): room is VisitedRoom => room !== null)
        .sort((left, right) => right.lastVisitedAt - left.lastVisitedAt)
}

export async function getVisitedRoom(hostProjectId: string): Promise<VisitedRoom | undefined> {
    const db = await getDb()
    return db.get('visitedRooms', hostProjectId)
}

async function evictOldestVisitedRooms(
    db: Awaited<ReturnType<typeof getDb>>,
    protectHostProjectId?: string,
): Promise<void> {
    let rooms = await db.getAll('visitedRooms')

    while (rooms.length > MAX_VISITED_ROOMS) {
        const sorted = [...rooms].sort((left, right) => left.lastVisitedAt - right.lastVisitedAt)
        const victim = sorted.find(room => room.hostProjectId !== protectHostProjectId) ?? sorted[0]

        await deleteVisitedRoom(victim.hostProjectId)
        rooms = await db.getAll('visitedRooms')
    }
}

export async function putVisitedRoom(
    room: VisitedRoom,
    options?: { protectHostProjectId?: string },
): Promise<void> {
    const db = await getDb()
    await db.put('visitedRooms', room)
    await evictOldestVisitedRooms(db, options?.protectHostProjectId)
}

export async function deleteVisitedRoom(hostProjectId: string): Promise<void> {
    const db = await getDb()
    const room = await db.get('visitedRooms', hostProjectId)

    if (!room) {
        return
    }

    await deleteAssetsByProjectId(room.localProjectId)
    assetsDebugLog.visitedRoomEvict(room.lastRoomId, room.localProjectId)
    await db.delete('visitedRooms', hostProjectId)
}

export async function getAssetsByProjectId(projectId: string): Promise<ProjectAssetRecord[]> {
    const db = await getDb()
    return db.getAllFromIndex('assets', 'by-project', projectId)
}

export async function getAssetRecord(id: number): Promise<ProjectAssetRecord | undefined> {
    const db = await getDb()
    return db.get('assets', id)
}

export async function putAsset(asset: ProjectAssetNewRecord): Promise<number> {
    const db = await getDb()
    return db.add('assets', {
        ...asset,
        createdAt: Date.now(),
    } as ProjectAssetRecord)
}

/** Store asset with a fixed id when free or already owned by this project (never steals from other projects). */
export async function putAssetWithId(
    id: number,
    asset: ProjectAssetNewRecord,
): Promise<number> {
    const result = await putProjectAsset(id, asset)
    return result.id
}

export async function putProjectAsset(
    preferredId: number,
    asset: ProjectAssetNewRecord,
): Promise<PutProjectAssetResult> {
    const db = await getDb()
    const existing = await db.get('assets', preferredId)

    if (existing?.projectId === asset.projectId) {
        await db.put('assets', {
            ...asset,
            id: preferredId,
            createdAt: existing.createdAt,
        } as ProjectAssetRecord)
        assetsDebugLog.putReuse(preferredId, asset.projectId, asset.name)
        return { id: preferredId }
    }

    if (existing && existing.projectId !== asset.projectId) {
        const newId = await putAsset(asset)
        assetsDebugLog.putCollision(
            preferredId,
            newId,
            existing.projectId,
            asset.projectId,
            asset.name,
        )
        return { id: newId, remappedFrom: preferredId }
    }

    await db.put('assets', {
        ...asset,
        id: preferredId,
        createdAt: Date.now(),
    } as ProjectAssetRecord)
    assetsDebugLog.putNew(preferredId, asset.projectId, asset.name)
    return { id: preferredId }
}

export async function deleteAsset(id: number): Promise<void> {
    const db = await getDb()
    await db.delete('assets', id)
}

export async function deleteAssetsByProjectId(projectId: string): Promise<void> {
    const db = await getDb()
    const assets = await db.getAllFromIndex('assets', 'by-project', projectId)
    const tx = db.transaction('assets', 'readwrite')
    await Promise.all([
        ...assets.map(asset => tx.store.delete(asset.id)),
        tx.done,
    ])
}
