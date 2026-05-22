import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Project, MetaRecord, CURRENT_PROJECT_ID_KEY } from './types'

interface CchheesDB extends DBSchema {
    projects: {
        key: string
        value: Project
    }
    meta: {
        key: string
        value: MetaRecord
    }
}

const DB_NAME = 'cchhees'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<CchheesDB>> | undefined

function getDb() {
    if (!dbPromise) {
        dbPromise = openDB<CchheesDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains('meta')) {
                    db.createObjectStore('meta', { keyPath: 'key' })
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
