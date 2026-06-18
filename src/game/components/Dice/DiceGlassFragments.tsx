import { FC, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, MeshPhysicalMaterial } from 'three'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import {
    createGlassFragmentSpawns,
    BreakSnapshot,
    GlassFragmentSpawn,
} from './glassFracture'
import {
    DicePhysicsParams,
    SETTLED_FRAMES_REQUIRED,
    SETTLED_SPEED_THRESHOLD,
} from './dicePhysics'

interface DiceGlassFragmentsProps {
    snapshot: BreakSnapshot
    params: DicePhysicsParams
    onSettled: () => void
}

interface GlassShardProps {
    spawn: GlassFragmentSpawn
    mass: number
    params: DicePhysicsParams
    material: MeshPhysicalMaterial
    geometry: BoxGeometry
    bodyRef: (body: RapierRigidBody | null) => void
}

function GlassShard({
    spawn,
    mass,
    params,
    material,
    geometry,
    bodyRef,
}: GlassShardProps) {
    const [hx, hy, hz] = spawn.halfExtents

    return (
        <RigidBody
            ref={bodyRef}
            type="dynamic"
            position={spawn.position}
            linearVelocity={spawn.linearVelocity}
            angularVelocity={spawn.angularVelocity}
            mass={mass}
            restitution={params.restitution * 0.6}
            friction={params.friction * 0.5}
            linearDamping={params.linearDamping}
            angularDamping={params.angularDamping}
        >
            <mesh
                castShadow
                receiveShadow
                geometry={geometry}
                material={material}
                scale={[hx * 2, hy * 2, hz * 2]}
            />
            <CuboidCollider args={spawn.halfExtents} />
        </RigidBody>
    )
}

export const DiceGlassFragments: FC<DiceGlassFragmentsProps> = ({
    snapshot,
    params,
    onSettled,
}) => {
    const settledFramesRef = useRef(0)
    const bodiesRef = useRef<(RapierRigidBody | null)[]>([])
    const spawns = useMemo(() => createGlassFragmentSpawns(snapshot), [snapshot])
    const shardMass = params.mass / spawns.length

    const geometry = useMemo(
        () => new BoxGeometry(1, 1, 1),
        [],
    )

    const material = useMemo(
        () => new MeshPhysicalMaterial({
            color: '#d4e8ff',
            transparent: true,
            opacity: 0.55,
            roughness: 0.08,
            metalness: 0,
            transmission: 0.88,
            thickness: 0.12,
            ior: 1.45,
        }),
        [],
    )

    useEffect(() => {
        bodiesRef.current = new Array(spawns.length).fill(null)
    }, [spawns.length, snapshot])

    useEffect(() => () => {
        geometry.dispose()
        material.dispose()
    }, [geometry, material])

    useFrame(() => {
        const bodies = bodiesRef.current.filter(Boolean) as RapierRigidBody[]
        if (bodies.length === 0) {
            return
        }

        const maxSpeed = bodies.reduce((peak, body) => {
            const linvel = body.linvel()
            const angvel = body.angvel()
            const speed = Math.hypot(linvel.x, linvel.y, linvel.z)
                + Math.hypot(angvel.x, angvel.y, angvel.z)
            return Math.max(peak, speed)
        }, 0)

        if (maxSpeed < SETTLED_SPEED_THRESHOLD) {
            settledFramesRef.current += 1
            if (settledFramesRef.current >= SETTLED_FRAMES_REQUIRED) {
                onSettled()
            }
            return
        }

        settledFramesRef.current = 0
    })

    return (
        <>
            {spawns.map((spawn, index) => (
                <GlassShard
                    key={`shard-${index}`}
                    spawn={spawn}
                    mass={shardMass}
                    params={params}
                    material={material}
                    geometry={geometry}
                    bodyRef={(body) => {
                        bodiesRef.current[index] = body
                    }}
                />
            ))}
        </>
    )
}
