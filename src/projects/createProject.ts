import { createEmptyProjectData } from './types'

export function createEmptyProject(name: string) {
    return createEmptyProjectData(name)
}

export function getDefaultProjectName(existingCount: number): string {
    return `Проект ${existingCount + 1}`
}
