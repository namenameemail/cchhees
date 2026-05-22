import { GameState } from '../game/types/gameState'
import { GameStateHistory } from '../game/types/history'

export interface Project {
    id: string
    name: string
    updatedAt: number
    gameState: GameState
    stateHistory: GameStateHistory
}

export interface ProjectPersistData {
    state: GameState
    stateHistory: GameStateHistory
}

export interface MetaRecord {
    key: string
    value: string
}

export const CURRENT_PROJECT_ID_KEY = 'currentProjectId'
