import { getAssetsByProjectId, putAsset, putProject } from './db'
import {
    remapAssetIdsInBoardHistory,
    remapAssetIdsInGameState,
} from './assetIdRemap'
import { Project, normalizeLoadedProject } from './types'

export const PROJECT_FILE_KIND = 'cchhees-project'
export const PROJECT_FILE_VERSION = 1

export interface ProjectFileAsset {
    id: number
    name: string
    mimeType: string
    data: string
}

export interface ProjectFile {
    kind: typeof PROJECT_FILE_KIND
    version: typeof PROJECT_FILE_VERSION
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
        && file.version === PROJECT_FILE_VERSION
        && typeof file.project?.name === 'string'
        && file.project.gameState != null
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

export async function buildProjectExportFile(project: Project): Promise<ProjectFile> {
    const assets = await getAssetsByProjectId(project.id)
    const exportedAssets = await Promise.all(assets.map(async asset => ({
        id: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        data: await blobToBase64(asset.blob),
    })))

    return {
        kind: PROJECT_FILE_KIND,
        version: PROJECT_FILE_VERSION,
        exportedAt: Date.now(),
        project: {
            name: project.name,
            updatedAt: project.updatedAt,
            gameState: project.gameState,
            figuresHistory: project.figuresHistory,
            boardHistory: project.boardHistory,
        },
        assets: exportedAssets,
    }
}

export async function exportProjectToFile(project: Project): Promise<void> {
    const file = await buildProjectExportFile(project)
    downloadJson(`${createSafeFilename(project.name)}.cchhees.json`, file)
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

    const migrated = normalizeLoadedProject({
        id: 'import',
        name: parsed.project.name,
        updatedAt: parsed.project.updatedAt ?? Date.now(),
        gameState: parsed.project.gameState,
        figuresHistory: parsed.project.figuresHistory,
        boardHistory: parsed.project.boardHistory,
    })

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

    const project: Project = {
        id: projectId,
        name: resolveImportName(migrated.name.trim() || 'Импортированный проект', existingProjects),
        updatedAt: Date.now(),
        gameState: remapAssetIdsInGameState(migrated.gameState, idMap),
        figuresHistory: migrated.figuresHistory,
        boardHistory: remapAssetIdsInBoardHistory(migrated.boardHistory, idMap),
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
