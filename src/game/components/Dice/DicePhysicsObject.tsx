import { FC, Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import {
    CuboidCollider,
    MeshCollider,
    RapierRigidBody,
    RigidBody,
} from '@react-three/rapier'
import {
    createBuiltinDiceGeometry,
    createBuiltinDiceMaterials,
    disposeBuiltinDiceMaterials,
} from './builtinDice'
import {
    DicePhysicsParams,
    DiceSimState,
    SETTLED_FRAMES_REQUIRED,
    SETTLED_SPEED_THRESHOLD,
} from './dicePhysics'
import { BreakSnapshot, GLASS_BREAK_IMPACT_THRESHOLD } from './glassFracture'

interface DicePhysicsObjectProps {
    modelUrl: string | null
    params: DicePhysicsParams
    simState: DiceSimState
    bodyKey: number
    onDrop: () => void
    onSettled: () => void
    onBreak: (snapshot: BreakSnapshot) => void
}

function randomSpin(maxSpin: number): Vector3 {
    return new Vector3(
        (Math.random() - 0.5) * maxSpin * 2,
        (Math.random() - 0.5) * maxSpin * 2,
        (Math.random() - 0.5) * maxSpin * 2,
    )
}

function GltfModel({ url, onPointerDown }: { url: string; onPointerDown: () => void }) {
    const { scene } = useGLTF(url)

    const object = useMemo(() => {
        const clone = scene.clone(true)
        const box = new Box3().setFromObject(clone)
        const size = box.getSize(new Vector3())
        const center = box.getCenter(new Vector3())
        const maxDim = Math.max(size.x, size.y, size.z, 0.0001)

        clone.position.sub(center)
        clone.scale.setScalar(1 / maxDim)

        clone.traverse(child => {
            if ('isMesh' in child && child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })

        return clone
    }, [scene])

    return (
        <group onPointerDown={onPointerDown}>
            <MeshCollider type="hull">
                <primitive object={object} />
            </MeshCollider>
        </group>
    )
}

function BuiltinDiceMesh({ onPointerDown }: { onPointerDown: () => void }) {
    const geometry = useMemo(() => createBuiltinDiceGeometry(), [])
    const materials = useMemo(() => createBuiltinDiceMaterials(), [])

    useEffect(() => () => {
        geometry.dispose()
        disposeBuiltinDiceMaterials(materials)
    }, [geometry, materials])

    return (
        <>
            <mesh
                castShadow
                receiveShadow
                material={materials}
                geometry={geometry}
                onPointerDown={onPointerDown}
            />
            <CuboidCollider args={[0.5, 0.5, 0.5]} />
        </>
    )
}

export const DicePhysicsObject: FC<DicePhysicsObjectProps> = ({
    modelUrl,
    params,
    simState,
    bodyKey,
    onDrop,
    onSettled,
    onBreak,
}) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null)
    const settledFramesRef = useRef(0)
    const launchedRef = useRef(false)
    const brokenRef = useRef(false)

    useEffect(() => {
        launchedRef.current = false
        settledFramesRef.current = 0
        brokenRef.current = false
    }, [bodyKey])

    useEffect(() => {
        const body = rigidBodyRef.current
        if (!body || simState !== 'idle') {
            return
        }

        body.setTranslation({ x: 0, y: params.spawnHeight, z: 0 }, true)
        body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        body.setBodyType(RigidBodyType.KinematicPositionBased, true)
    }, [simState, params.spawnHeight, bodyKey])

    useEffect(() => {
        const body = rigidBodyRef.current
        if (!body || simState !== 'running' || launchedRef.current) {
            return
        }

        launchedRef.current = true
        body.setBodyType(RigidBodyType.Dynamic, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        const spin = randomSpin(params.spawnSpin)
        body.setAngvel({ x: spin.x, y: spin.y, z: spin.z }, true)
    }, [simState, params.spawnSpin, bodyKey])

    useFrame(() => {
        const body = rigidBodyRef.current
        if (!body || simState !== 'running' || brokenRef.current) {
            return
        }

        const linvel = body.linvel()
        const angvel = body.angvel()
        const speed = Math.hypot(linvel.x, linvel.y, linvel.z)
            + Math.hypot(angvel.x, angvel.y, angvel.z)

        if (speed < SETTLED_SPEED_THRESHOLD) {
            settledFramesRef.current += 1
            if (settledFramesRef.current >= SETTLED_FRAMES_REQUIRED) {
                onSettled()
            }
            return
        }

        settledFramesRef.current = 0
    })

    const handleCollisionEnter = (payload: { other: { rigidBody?: { bodyType: () => RigidBodyType } } }) => {
        if (!params.glassBreak || brokenRef.current || simState !== 'running') {
            return
        }

        const otherBody = payload.other.rigidBody
        if (!otherBody || otherBody.bodyType() !== RigidBodyType.Fixed) {
            return
        }

        const body = rigidBodyRef.current
        if (!body) {
            return
        }

        const linvel = body.linvel()
        const impactSpeed = Math.hypot(linvel.x, linvel.y, linvel.z)
        if (impactSpeed < GLASS_BREAK_IMPACT_THRESHOLD) {
            return
        }

        brokenRef.current = true
        const translation = body.translation()
        const rotation = body.rotation()
        const angularVelocity = body.angvel()

        onBreak({
            position: [translation.x, translation.y, translation.z],
            rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
            linearVelocity: [linvel.x, linvel.y, linvel.z],
            angularVelocity: [angularVelocity.x, angularVelocity.y, angularVelocity.z],
            modelUrl,
        })
    }

    const handlePointerDown = () => {
        if (simState === 'idle') {
            onDrop()
        }
    }

    return (
        <RigidBody
            key={bodyKey}
            ref={rigidBodyRef}
            type="kinematicPosition"
            position={[0, params.spawnHeight, 0]}
            colliders={modelUrl ? false : undefined}
            mass={params.mass}
            restitution={params.restitution}
            friction={params.friction}
            linearDamping={params.linearDamping}
            angularDamping={params.angularDamping}
            onCollisionEnter={handleCollisionEnter}
        >
            {modelUrl ? (
                <Suspense fallback={null}>
                    <GltfModel url={modelUrl} onPointerDown={handlePointerDown} />
                </Suspense>
            ) : (
                <BuiltinDiceMesh onPointerDown={handlePointerDown} />
            )}
        </RigidBody>
    )
}
