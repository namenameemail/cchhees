import { getAssetsByProjectId, putAsset, putProject } from './db'
import {
    remapAssetIdsInProjectPersist,
} from './assetIdRemap'
import { Project, normalizeLoadedProject, projectToPersistData } from './types'

export const PROJECT_FILE_KIND = 'cchhees-project'
export const PROJECT_FILE_VERSION = 2

export interface ProjectFileAsset {
    id: number
    name: string
    mimeType: string
    data: string
}

export interface ProjectFileV2 {
    kind: typeof PROJECT_FILE_KIND
    version: typeof PROJECT_FILE_VERSION
    exportedAt: number
    project: {
        name: string
        updatedAt: number
        figureCatalog: unknown
        catalogHistory: unknown
        boards: unknown
        activeBoardId: string
        previewDataUrl?: string
    }
    assets: ProjectFileAsset[]
}

export interface ProjectFileV1 {
    kind: typeof PROJECT_FILE_KIND
    version: 1
    exportedAt: number
    project: {
        name: string
        updatedAt: number
        gameState: unknown
        figuresHistory: unknown
        boardHistory: unknown
    }
    assets: ProjectFileAsset[]
}

export type ProjectFile = ProjectFileV1 | ProjectFileV2

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            const commaIndex = result.indexOf(',')

            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
        }
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
        reader.readAsDataURL(blob)
    })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }

    return new Blob([bytes], { type: mimeType })
}

function isProjectFile(value: unknown): value is ProjectFile {
    if (!value || typeof value !== 'object') {
        return false
    }

    const file = value as Partial<ProjectFile>

    return file.kind === PROJECT_FILE_KIND
        && (file.version === 1 || file.version === PROJECT_FILE_VERSION)
        && typeof file.project?.name === 'string'
        && Array.isArray(file.assets)
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

function createSafeFilename(name: string): string {
    return name.trim().replace(/[^\w\u0400-\u04FF.-]+/g, '_') || 'project'
}

function downloadJson(filename: string, data: unknown): void {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
}

export async function buildProjectExportFile(project: Project): Promise<ProjectFileV2> {
    const assets = await getAssetsByProjectId(project.id)
    const exportedAssets = await Promise.all(assets.map(async asset => ({
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        data: await blobToBase64(asset.blob),
    })))
    const persist = projectToPersistData(project)

    return {
        kind: PROJECT_FILE_KIND,
        version: PROJECT_FILE_VERSION,
        exportedAt: Date.now(),
        project: {
            name: project.name,
            updatedAt: project.updatedAt,
            figureCatalog: persist.figureCatalog,
            catalogHistory: persist.catalogHistory,
            boards: persist.boards,
            activeBoardId: persist.activeBoardId,
            previewDataUrl: project.previewDataUrl,
        },
        assets: exportedAssets,
    }
}

export async function exportProjectToFile(project: Project): Promise<void> {
    const file = await buildProjectExportFile(project)
    downloadJson(`${createSafeFilename(project.name)}.cchhees.json`, file)
}

function normalizeImportProject(file: ProjectFile): Project {
    if (file.version === PROJECT_FILE_VERSION) {
        return normalizeLoadedProject({
            id: 'import',
            name: file.project.name,
            updatedAt: file.project.updatedAt ?? Date.now(),
            figureCatalog: file.project.figureCatalog,
            catalogHistory: file.project.catalogHistory,
            boards: file.project.boards,
            activeBoardId: file.project.activeBoardId,
            previewDataUrl: file.project.previewDataUrl,
        } as Parameters<typeof normalizeLoadedProject>[0])
    }

    return normalizeLoadedProject({
        id: 'import',
        name: file.project.name,
        updatedAt: file.project.updatedAt ?? Date.now(),
        gameState: file.project.gameState,
        figuresHistory: file.project.figuresHistory,
        boardHistory: file.project.boardHistory,
    })
}

export async function importProjectFromFile(
    file: File,
    existingProjects: Project[],
): Promise<Project> {
    let parsed: unknown

    try {
        parsed = JSON.parse(await file.text())
    } catch {
        throw new Error('Файл не является корректным JSON')
    }

    if (!isProjectFile(parsed)) {
        throw new Error('Неверный формат файла проекта')
    }

    const migrated = normalizeImportProject(parsed)
    const projectId = crypto.randomUUID()
    const idMap = new Map<number, number>()

    for (const asset of parsed.assets) {
        if (typeof asset.id !== 'number' || typeof asset.data !== 'string') {
            throw new Error('Неверный формат ассетов в файле проекта')
        }

        const blob = base64ToBlob(asset.data, asset.mimeType || 'application/octet-stream')
        const newId = await putAsset({
            projectId,
            name: asset.name,
            mimeType: asset.mimeType || blob.type || 'application/octet-stream',
            blob,
            size: blob.size,
        })

        idMap.set(asset.id, newId)
    }

    const remapped = remapAssetIdsInProjectPersist(projectToPersistData(migrated), idMap)

    const project: Project = {
        id: projectId,
        name: resolveImportName(migrated.name.trim() || 'Импортированный проект', existingProjects),
        updatedAt: Date.now(),
        figureCatalog: remapped.figureCatalog,
        catalogHistory: remapped.catalogHistory,
        boards: remapped.boards,
        activeBoardId: remapped.activeBoardId,
    }

    await putProject(project)

    return project
}

export function isProjectImportFile(file: File): boolean {
    const lowerName = file.name.toLowerCase()

    return lowerName.endsWith('.json')
        || lowerName.endsWith('.cchhees.json')
        || file.type === 'application/json'
}
