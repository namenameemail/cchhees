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
    glassCull: boolean
    modelScale: number
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
    glassCull: false,
    modelScale: 1,
}

export type DiceLightPreset = 'corner' | 'top' | 'front' | 'side'

export interface DiceLightParams {
    ambientIntensity: number
    directIntensity: number
    lightPreset: DiceLightPreset
    lightColor: string
    sceneLightsEnabled: boolean
    gltfLightsEnabled: boolean
}

export const DEFAULT_DICE_LIGHT_PARAMS: DiceLightParams = {
    ambientIntensity: 0.3,
    directIntensity: 3.5,
    lightPreset: 'corner',
    lightColor: '#fff5e0',
    sceneLightsEnabled: true,
    gltfLightsEnabled: true,
}

export const LIGHT_PRESET_POSITIONS: Record<DiceLightPreset, [number, number, number]> = {
    corner: [5, 8, 4],
    top: [0, 10, 0],
    front: [0, 6, 10],
    side: [10, 6, 0],
}

export const LIGHT_PRESET_LABELS: Record<DiceLightPreset, string> = {
    corner: 'угол',
    top: 'сверху',
    front: 'спереди',
    side: 'сбоку',
}

export const SETTLED_SPEED_THRESHOLD = 0.15
export const SETTLED_FRAMES_REQUIRED = 15
// Speed above which the counter fully resets (dice is truly in motion, not just jittering on surface)
export const SETTLED_RESET_SPEED = 1.5
// After this many seconds in 'running' state the dice is force-settled regardless of speed
export const SETTLED_TIMEOUT_SECONDS = 8
