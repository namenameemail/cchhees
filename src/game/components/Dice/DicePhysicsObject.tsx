import { FC, MutableRefObject, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { BackSide, Box3, DoubleSide, Light, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Vector3 } from 'three'
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
    SETTLED_RESET_SPEED,
    SETTLED_SPEED_THRESHOLD,
    SETTLED_TIMEOUT_SECONDS,
} from './dicePhysics'
import { BreakSnapshot, GLASS_BREAK_IMPACT_THRESHOLD } from './glassFracture'
import { diceDebugLog } from './diceDebugLog'

export type DiceSettledPose = {
    position: [number, number, number]
    rotation: [number, number, number, number]
}

interface DicePhysicsObjectProps {
    modelUrl: string | null
    params: DicePhysicsParams
    simState: DiceSimState
    bodyKey: number
    throwSpin?: [number, number, number]
    externalSettledPose?: DiceSettledPose | null
    positionRef?: MutableRefObject<Vector3>
    gltfLightsEnabled: boolean
    onDrop: () => void
    onSettled: (pose: DiceSettledPose) => void
    onBreak: (snapshot: BreakSnapshot) => void
}

function randomSpin(maxSpin: number): Vector3 {
    return new Vector3(
        (Math.random() - 0.5) * maxSpin * 2,
        (Math.random() - 0.5) * maxSpin * 2,
        (Math.random() - 0.5) * maxSpin * 2,
    )
}

function GltfModel({ url, scale, glassCull, gltfLightsEnabled, onPointerDown }: {
    url: string
    scale: number
    glassCull: boolean
    gltfLightsEnabled: boolean
    onPointerDown: () => void
}) {
    const { scene } = useGLTF(url)
    const [hovered, setHovered] = useState(false)

    const { object, glowObjects, glowMaterials, lights } = useMemo(() => {
        const clone = scene.clone(true)
        const lights: Light[] = []

        clone.traverse(child => {
            if ((child as Light).isLight) {
                lights.push(child as Light)
            }
            if ('isMesh' in child && child.isMesh) {
                const mesh = child as Mesh
                mesh.castShadow = true
                mesh.receiveShadow = true
            }
        })

        const box = new Box3()
        clone.traverse(child => {
            if ('isMesh' in child && child.isMesh) box.expandByObject(child)
        })

        let normalScale = 1
        if (!box.isEmpty()) {
            const size = box.getSize(new Vector3())
            const center = box.getCenter(new Vector3())
            const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
            normalScale = 1 / maxDim
            clone.position.sub(center)
            clone.scale.setScalar(normalScale)
        }

        const glowLayers = [
            { scale: 1.035, opacity: 0.45 },
            { scale: 1.075, opacity: 0.18 },
            { scale: 1.13,  opacity: 0.07 },
        ]

        const glowMaterials = glowLayers.map(({ opacity }) =>
            new MeshBasicMaterial({ color: 0xffffff, side: BackSide, depthWrite: false, transparent: true, opacity }),
        )

        const glowObjects = glowLayers.map(({ scale }, i) => {
            const glow = scene.clone(true)
            glow.traverse(child => {
                if ('isMesh' in child && child.isMesh) {
                    (child as Mesh).material = glowMaterials[i]
                }
            })
            glow.position.copy(clone.position)
            glow.scale.setScalar(normalScale * scale)
            return glow
        })

        return { object: clone, glowObjects, glowMaterials, lights }
    }, [scene])

    useEffect(() => () => {
        glowMaterials.forEach(m => m.dispose())
    }, [glowMaterials])

    useEffect(() => {
        object.traverse(child => {
            if (!('isMesh' in child && child.isMesh)) return
            const mesh = child as Mesh
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach((mat: Material) => {
                if (!(mat instanceof MeshStandardMaterial)) return
                if (mat instanceof MeshPhysicalMaterial && mat.transmission > 0) {
                    // transparent=true ломает transmission-пас, depthWrite управляет "срезом".
                    mat.side = DoubleSide
                    mat.depthWrite = glassCull
                    mat.needsUpdate = true
                } else if (mat.transparent || mat.opacity < 1) {
                    mat.side = DoubleSide
                    mat.depthWrite = glassCull
                    mat.transparent = true
                    mat.needsUpdate = true
                }
            })
        })
    }, [object, glassCull])

    useEffect(() => {
        lights.forEach(light => { light.visible = gltfLightsEnabled })
    }, [lights, gltfLightsEnabled])

    const handlePointerOver = useCallback(() => setHovered(true), [])
    const handlePointerOut = useCallback(() => setHovered(false), [])

    return (
        <group
            scale={scale}
            onPointerDown={onPointerDown}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            <MeshCollider type="hull">
                <primitive object={object} />
            </MeshCollider>
            {hovered && glowObjects.map((obj, i) => <primitive key={i} object={obj} />)}
        </group>
    )
}

function BuiltinDiceMesh({ scale, onPointerDown }: { scale: number; onPointerDown: () => void }) {
    const geometry = useMemo(() => createBuiltinDiceGeometry(), [])
    const materials = useMemo(() => createBuiltinDiceMaterials(), [])

    useEffect(() => () => {
        geometry.dispose()
        disposeBuiltinDiceMaterials(materials)
    }, [geometry, materials])

    const h = 0.5 * scale

    return (
        <>
            <mesh
                scale={scale}
                castShadow
                receiveShadow
                material={materials}
                geometry={geometry}
                onPointerDown={onPointerDown}
            />
            <CuboidCollider args={[h, h, h]} />
        </>
    )
}

export const DicePhysicsObject: FC<DicePhysicsObjectProps> = ({
    modelUrl,
    params,
    simState,
    bodyKey,
    throwSpin,
    externalSettledPose,
    positionRef,
    gltfLightsEnabled,
    onDrop,
    onSettled,
    onBreak,
}) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null)
    const settledFramesRef = useRef(0)
    const launchedRef = useRef(false)
    const brokenRef = useRef(false)
    const frameLogRef = useRef(0)
    const wasSlowRef = useRef(false)
    const runningTimeRef = useRef(0)

    useEffect(() => {
        launchedRef.current = false
        settledFramesRef.current = 0
        brokenRef.current = false
        frameLogRef.current = 0
        wasSlowRef.current = false
        runningTimeRef.current = 0
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
        body.setTranslation({ x: 0, y: params.spawnHeight, z: 0 }, true)
        body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.setBodyType(RigidBodyType.Dynamic, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        const spin = throwSpin ? new Vector3(...throwSpin) : randomSpin(params.spawnSpin)
        body.setAngvel({ x: spin.x, y: spin.y, z: spin.z }, true)
    }, [simState, params.spawnSpin, params.spawnHeight, bodyKey, throwSpin])

    useEffect(() => {
        const body = rigidBodyRef.current
        if (!body || !externalSettledPose || simState !== 'running') {
            return
        }

        const [px, py, pz] = externalSettledPose.position
        const [rx, ry, rz, rw] = externalSettledPose.rotation
        body.setTranslation({ x: px, y: py, z: pz }, true)
        body.setRotation({ x: rx, y: ry, z: rz, w: rw }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        body.setBodyType(RigidBodyType.KinematicPositionBased, true)
        onSettled(externalSettledPose)
    }, [externalSettledPose, simState])

    useFrame((_, delta) => {
        const body = rigidBodyRef.current
        if (!body) return

        if (positionRef) {
            const t = body.translation()
            positionRef.current.set(t.x, t.y, t.z)
        }

        if (simState !== 'running' || brokenRef.current) return

        runningTimeRef.current += delta

        // Hard timeout: кубик катится/крутится слишком долго — аномалия физики.
        if (runningTimeRef.current >= SETTLED_TIMEOUT_SECONDS) {
            body.setLinvel({ x: 0, y: 0, z: 0 }, true)
            body.setAngvel({ x: 0, y: 0, z: 0 }, true)
            body.setBodyType(RigidBodyType.KinematicPositionBased, true)
            diceDebugLog.timeout(runningTimeRef.current)
            const t = body.translation()
            const r = body.rotation()
            onSettled({ position: [t.x, t.y, t.z], rotation: [r.x, r.y, r.z, r.w] })
            return
        }

        const linvel = body.linvel()
        const angvel = body.angvel()
        const speed = Math.hypot(linvel.x, linvel.y, linvel.z)
            + Math.hypot(angvel.x, angvel.y, angvel.z)

        // Гасим контактный джиттер и медленное качение: дополнительное затухание в зоне
        // медленного движения (0.15–1.5). Равновесная скорость при 0.9/кадр ≈ 0.01.
        if (speed >= SETTLED_SPEED_THRESHOLD && speed < SETTLED_RESET_SPEED) {
            body.setLinvel({ x: linvel.x * 0.9, y: linvel.y * 0.9, z: linvel.z * 0.9 }, true)
            body.setAngvel({ x: angvel.x * 0.9, y: angvel.y * 0.9, z: angvel.z * 0.9 }, true)
        }

        const below = speed < SETTLED_SPEED_THRESHOLD
        frameLogRef.current += 1

        if (wasSlowRef.current !== below) {
            wasSlowRef.current = below
            diceDebugLog.thresholdCross(speed, settledFramesRef.current, below)
        }
        if (frameLogRef.current % 90 === 0) {
            diceDebugLog.frame(speed, settledFramesRef.current)
        }

        if (below) {
            settledFramesRef.current += 1
            if (settledFramesRef.current >= SETTLED_FRAMES_REQUIRED) {
                body.setLinvel({ x: 0, y: 0, z: 0 }, true)
                body.setAngvel({ x: 0, y: 0, z: 0 }, true)
                body.setBodyType(RigidBodyType.KinematicPositionBased, true)
                diceDebugLog.settled()
                const t = body.translation()
                const r = body.rotation()
                onSettled({ position: [t.x, t.y, t.z], rotation: [r.x, r.y, r.z, r.w] })
            }
            return
        }

        // Контактный джиттер (0.15–1.5) не сбрасывает счётчик — он не замедляется сам по себе.
        // Только реальное движение (>1.5) означает что кубик ещё летит или подпрыгивает.
        if (speed >= SETTLED_RESET_SPEED) {
            const prevCounter = settledFramesRef.current
            settledFramesRef.current = 0
            if (prevCounter > 0) {
                diceDebugLog.counterReset()
            }
        }
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
        onDrop()
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
                    <GltfModel url={modelUrl} scale={params.modelScale} glassCull={params.glassCull} gltfLightsEnabled={gltfLightsEnabled} onPointerDown={handlePointerDown} />
                </Suspense>
            ) : (
                <BuiltinDiceMesh scale={params.modelScale} onPointerDown={handlePointerDown} />
            )}
        </RigidBody>
    )
}
