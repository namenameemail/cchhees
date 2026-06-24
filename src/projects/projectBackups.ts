import {
    getAllProjects,
    listBackupRecords,
    MAX_PROJECT_BACKUPS,
    pruneProjectBackups,
    putBackupRecord,
    restoreProjectsFromBackup,
} from './db'
import type { Project } from './types'
import type { ProjectsBackupRecord } from './types'

const BACKUP_DEBOUNCE_MS = 2000

let backupTimer: ReturnType<typeof setTimeout> | null = null
let pendingBackupProjects: Project[] | null = null

export async function writeProjectsBackupNow(projects: Project[]): Promise<ProjectsBackupRecord | null> {
    if (projects.length === 0) {
        return null
    }

    const record: ProjectsBackupRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        origin: typeof location !== 'undefined' ? location.origin : 'unknown',
        count: projects.length,
        projects: structuredClone(projects),
    }

    await putBackupRecord(record)
    await pruneProjectBackups(MAX_PROJECT_BACKUPS)
    return record
}

export function scheduleProjectsBackup(projects: Project[]): void {
    pendingBackupProjects = projects

    if (backupTimer) {
        clearTimeout(backupTimer)
    }

    backupTimer = setTimeout(() => {
        backupTimer = null
        const snapshot = pendingBackupProjects
        pendingBackupProjects = null

        if (!snapshot?.length) {
            return
        }

        void writeProjectsBackupNow(snapshot)
    }, BACKUP_DEBOUNCE_MS)
}

export async function listProjectBackups(): Promise<ProjectsBackupRecord[]> {
    return listBackupRecords()
}

export async function restoreProjectBackup(backupId: string): Promise<Project[]> {
    const backups = await listBackupRecords()
    const backup = backups.find(item => item.id === backupId)

    if (!backup) {
        throw new Error('Резервная копия не найдена')
    }

    await restoreProjectsFromBackup(backup.projects)
    return getAllProjects()
}

export async function tryRestoreFromLatestBackup(): Promise<{ projects: Project[]; backupId: string } | null> {
    const backups = await listBackupRecords()

    if (backups.length === 0) {
        return null
    }

    const latest = backups[0]!
    await restoreProjectsFromBackup(latest.projects)
    return {
        projects: await getAllProjects(),
        backupId: latest.id,
    }
}
