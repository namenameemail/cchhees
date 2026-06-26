import { openDB, DBSchema, IDBPDatabase } from 'idb'
import {
    Project,
    MetaRecord,
    ProjectsBackupRecord,
    CURRENT_PROJECT_ID_KEY,
    CURRENT_PROJECT_KIND_KEY,
    LAST_KNOWN_PROJECT_COUNT_KEY,
} from './types'
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
    backups: {
        key: string
        value: ProjectsBackupRecord
    }
}

import {
    checkDbSchema,
    DB_NAME,
    DB_VERSION,
    DbSchemaCheckResult,
} from './dbSchema'

export {
    checkDbSchema,
    DB_NAME,
    DB_VERSION,
    formatDbOperationError,
    formatDbSchemaError,
    REQUIRED_OBJECT_STORES,
    type DbSchemaCheckResult,
    type RequiredObjectStore,
} from './dbSchema'

const DB_NAME_INTERNAL = DB_NAME
const DB_VERSION_INTERNAL = DB_VERSION

/** Keep a single rolling backup to limit IndexedDB size. */
export const MAX_PROJECT_BACKUPS = 1

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

function ensureProjectsStore(db: IDBPDatabase<CchheesDB>): void {
    if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
    }
}

function ensureMetaStore(db: IDBPDatabase<CchheesDB>): void {
    if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
    }
}

function ensureAssetsStore(db: IDBPDatabase<CchheesDB>): void {
    if (db.objectStoreNames.contains('assets')) {
        return
    }

    const store = db.createObjectStore('assets', { keyPath: 'id', autoIncrement: true })
    store.createIndex('by-project', 'projectId', { unique: false })
}

function ensureVisitedRoomsStore(db: IDBPDatabase<CchheesDB>): void {
    if (!db.objectStoreNames.contains('visitedRooms')) {
        db.createObjectStore('visitedRooms', { keyPath: 'hostProjectId' })
    }
}

function ensureBackupsStore(db: IDBPDatabase<CchheesDB>): void {
    if (!db.objectStoreNames.contains('backups')) {
        db.createObjectStore('backups', { keyPath: 'id' })
    }
}

async function runDbUpgrade(
    db: IDBPDatabase<CchheesDB>,
    oldVersion: number,
    transaction: VisitedRoomsMigrationTx,
): Promise<void> {
    ensureProjectsStore(db)
    ensureMetaStore(db)
    ensureAssetsStore(db)

    if (oldVersion < 4) {
        if (oldVersion < 3 && !db.objectStoreNames.contains('visitedRooms')) {
            db.createObjectStore('visitedRooms', { keyPath: 'roomId' })
        }

        if (db.objectStoreNames.contains('visitedRooms')) {
            await migrateVisitedRoomsToHostProjectId(db, transaction)
        } else {
            ensureVisitedRoomsStore(db)
        }
    } else {
        ensureVisitedRoomsStore(db)
    }

    ensureBackupsStore(db)
}

export function resetDbConnection(): void {
    dbPromise = undefined
}

export function hasObjectStore(name: RequiredObjectStore): Promise<boolean> {
    return getDb().then(db => db.objectStoreNames.contains(name))
}

export async function assertDbSchema(): Promise<DbSchemaCheckResult> {
    const db = await getDb()
    return checkDbSchema(db)
}

function getDb() {
    if (!dbPromise) {
        dbPromise = openDB<CchheesDB>(DB_NAME_INTERNAL, DB_VERSION_INTERNAL, {
            upgrade(db, oldVersion, _newVersion, transaction) {
                return runDbUpgrade(
                    db,
                    oldVersion,
                    transaction as unknown as VisitedRoomsMigrationTx,
                )
            },
            blocked() {
                resetDbConnection()
            },
            terminated: () => {
                resetDbConnection()
            },
        }).then(db => {
            db.onversionchange = () => {
                db.close()
                resetDbConnection()
            }

            const schema = checkDbSchema(db)

            if (!schema.ok) {
                console.error('[projects] DB schema incomplete after open:', schema.missing)
            }

            return db
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

export function getDbInfo(): { name: string; version: number } {
    return { name: DB_NAME, version: DB_VERSION }
}

export async function createInitialProjectIfEmpty(
    factory: () => Project,
): Promise<{ projects: Project[]; created: boolean }> {
    const db = await getDb()
    const tx = db.transaction('projects', 'readwrite')
    const countBefore = await tx.store.count()

    if (countBefore === 0) {
        await tx.store.add(factory())
    }

    await tx.done
    return {
        projects: await getAllProjects(),
        created: countBefore === 0,
    }
}

export async function getLastKnownProjectCount(): Promise<number> {
    const db = await getDb()
    const record = await db.get('meta', LAST_KNOWN_PROJECT_COUNT_KEY)

    if (!record?.value) {
        return 0
    }

    const parsed = Number(record.value)
    return Number.isFinite(parsed) ? parsed : 0
}

export async function setLastKnownProjectCount(count: number): Promise<void> {
    const db = await getDb()
    await db.put('meta', { key: LAST_KNOWN_PROJECT_COUNT_KEY, value: String(count) })
}

export async function listBackupRecords(): Promise<ProjectsBackupRecord[]> {
    const db = await getDb()

    if (!db.objectStoreNames.contains('backups')) {
        return []
    }

    const backups = await db.getAll('backups')
    return backups.sort((left, right) => right.createdAt - left.createdAt)
}

export async function putBackupRecord(record: ProjectsBackupRecord): Promise<void> {
    const db = await getDb()

    if (!db.objectStoreNames.contains('backups')) {
        throw new Error('IndexedDB backups store is missing')
    }

    await db.put('backups', record)
}

export async function clearAllBackupRecords(): Promise<number> {
    const db = await getDb()

    if (!db.objectStoreNames.contains('backups')) {
        return 0
    }

    const backups = await listBackupRecords()

    if (backups.length === 0) {
        return 0
    }

    const tx = db.transaction('backups', 'readwrite')
    await Promise.all([
        ...backups.map(item => tx.store.delete(item.id)),
        tx.done,
    ])

    return backups.length
}

export async function pruneProjectBackups(maxCount: number): Promise<void> {
    const db = await getDb()

    if (!db.objectStoreNames.contains('backups')) {
        return
    }

    const backups = await listBackupRecords()

    if (backups.length <= maxCount) {
        return
    }

    const victims = backups.slice(maxCount)
    const tx = db.transaction('backups', 'readwrite')
    await Promise.all([
        ...victims.map(item => tx.store.delete(item.id)),
        tx.done,
    ])
}

export async function restoreProjectsFromBackup(projects: Project[]): Promise<void> {
    const db = await getDb()
    const tx = db.transaction('projects', 'readwrite')

    await Promise.all([
        ...projects.map(project => tx.store.put(project)),
        tx.done,
    ])
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
