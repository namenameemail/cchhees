import { Quaternion, Vector3 } from 'three'

const GRID = 4
const CELL = 1 / GRID
const HALF = CELL * 0.47

export interface GlassFragmentSpec {
    localPosition: Vector3
    halfExtents: [number, number, number]
}

export interface BreakSnapshot {
    position: [number, number, number]
    rotation: [number, number, number, number]
    linearVelocity: [number, number, number]
    angularVelocity: [number, number, number]
    modelUrl: string | null
}

export interface GlassFragmentSpawn {
    position: [number, number, number]
    halfExtents: [number, number, number]
    linearVelocity: [number, number, number]
    angularVelocity: [number, number, number]
}

export const GLASS_BREAK_IMPACT_THRESHOLD = 2.5

const FRAGMENT_SPECS: GlassFragmentSpec[] = (() => {
    const specs: GlassFragmentSpec[] = []

    for (let ix = 0; ix < GRID; ix += 1) {
        for (let iy = 0; iy < GRID; iy += 1) {
            for (let iz = 0; iz < GRID; iz += 1) {
                specs.push({
                    localPosition: new Vector3(
                        -0.5 + CELL * (ix + 0.5),
                        -0.5 + CELL * (iy + 0.5),
                        -0.5 + CELL * (iz + 0.5),
                    ),
                    halfExtents: [HALF, HALF, HALF],
                })
            }
        }
    }

    return specs
})()

export function createGlassFragmentSpawns(snapshot: BreakSnapshot): GlassFragmentSpawn[] {
    const quaternion = new Quaternion(
        snapshot.rotation[0],
        snapshot.rotation[1],
        snapshot.rotation[2],
        snapshot.rotation[3],
    )
    const origin = new Vector3(...snapshot.position)
    const baseLinear = new Vector3(...snapshot.linearVelocity)
    const baseAngular = new Vector3(...snapshot.angularVelocity)

    return FRAGMENT_SPECS.map(spec => {
        const offset = spec.localPosition.clone().applyQuaternion(quaternion)
        const position = origin.clone().add(offset)
        const scatter = new Vector3(
            (Math.random() - 0.5) * 1.6,
            Math.random() * 1.2,
            (Math.random() - 0.5) * 1.6,
        )

        return {
            position: [position.x, position.y, position.z],
            halfExtents: spec.halfExtents,
            linearVelocity: [
                baseLinear.x + scatter.x,
                baseLinear.y + scatter.y,
                baseLinear.z + scatter.z,
            ],
            angularVelocity: [
                baseAngular.x + (Math.random() - 0.5) * 10,
                baseAngular.y + (Math.random() - 0.5) * 10,
                baseAngular.z + (Math.random() - 0.5) * 10,
            ],
        }
    })
}
