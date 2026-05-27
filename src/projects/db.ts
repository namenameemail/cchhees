import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Project, MetaRecord, CURRENT_PROJECT_ID_KEY } from './types'
import { ProjectAssetNewRecord, ProjectAssetRecord } from './assets/types'

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
}

const DB_NAME = 'cchhees'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<CchheesDB>> | undefined

function getDb() {
    if (!dbPromise) {
        dbPromise = openDB<CchheesDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
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
            },
        })
    }
    return dbPromise
}

export async function getAllProjects(): Promise<Project[]> {
    const db = await getDb()
    const projects = await db.getAll('projects')
    return projects.sort((a, b) => b.updatedAt - a.updatedAt)
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

export async function getAssetsByProjectId(projectId: string): Promise<ProjectAssetRecord[]> {
    const db = await getDb()
    return db.getAllFromIndex('assets', 'by-project', projectId)
}

export async function putAsset(asset: ProjectAssetNewRecord): Promise<number> {
    const db = await getDb()
    return db.add('assets', {
        ...asset,
        createdAt: Date.now(),
    } as ProjectAssetRecord)
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
