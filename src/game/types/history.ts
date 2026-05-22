import { GameState } from './gameState'

export interface GameStateHistory {
    before: GameState[]
    after: GameState[]
}