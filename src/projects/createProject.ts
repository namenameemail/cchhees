import { historyInit } from '../game/context/history'
import { initialGameState } from '../game/utils'
import { Project } from './types'

export function createEmptyProject(name: string): Project {
    return {
        id: crypto.randomUUID(),
        name,
        updatedAt: Date.now(),
        gameState: structuredClone(initialGameState),
        stateHistory: historyInit(),
    }
}

export function getDefaultProjectName(existingCount: number): string {
    return `Проект ${existingCount + 1}`
}
