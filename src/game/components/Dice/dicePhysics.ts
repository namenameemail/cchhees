export type DiceSimState = 'idle' | 'running' | 'broken' | 'settled'

export interface DicePhysicsParams {
    gravity: number
    mass: number
    restitution: number
    friction: number
    linearDamping: number
    angularDamping: number
    spawnHeight: number
    spawnSpin: number
    glassBreak: boolean
}

export const DEFAULT_DICE_PHYSICS_PARAMS: DicePhysicsParams = {
    gravity: -9.81,
    mass: 1,
    restitution: 0.3,
    friction: 0.8,
    linearDamping: 0.1,
    angularDamping: 0.2,
    spawnHeight: 3,
    spawnSpin: 8,
    glassBreak: false,
}

export const SETTLED_SPEED_THRESHOLD = 0.08
export const SETTLED_FRAMES_REQUIRED = 20
