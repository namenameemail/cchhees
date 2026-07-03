import { FC, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { Cloud, Clouds, MeshReflectorMaterial, OrbitControls, Sky } from '@react-three/drei'
import { ACESFilmicToneMapping, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { DicePhysicsObject, DiceSettledPose } from './DicePhysicsObject'
import { DiceGlassFragments } from './DiceGlassFragments'
import { DiceLightParams, DicePhysicsParams, DiceSimState, LIGHT_PRESET_POSITIONS } from './dicePhysics'
import { BreakSnapshot } from './glassFracture'
import styles from './DicePanel.module.css'

interface DiceSceneProps {
    modelUrl: string | null
    params: DicePhysicsParams
    lightParams: DiceLightParams
    simState: DiceSimState
    bodyKey: number
    breakSnapshot: BreakSnapshot | null
    throwSpin?: [number, number, number]
    externalSettledPose?: DiceSettledPose | null
    fill?: boolean
    onDrop: () => void
    onSettled: (pose: DiceSettledPose) => void
    onBreak: (snapshot: BreakSnapshot) => void
}

const FLOOR_SIZE = 14
const WALL_H = 2
const WALL_HALF = FLOOR_SIZE / 2

function SceneContent({
    modelUrl,
    params,
    lightParams,
    simState,
    bodyKey,
    breakSnapshot,
    throwSpin,
    externalSettledPose,
    onDrop,
    onSettled,
    onBreak,
}: DiceSceneProps) {
    const dicePositionRef = useRef(new Vector3())
    const controlsRef = useRef<OrbitControlsImpl>(null)
    const zoomDistRef = useRef(7)

    useFrame(({ camera }) => {
        const controls = controlsRef.current
        if (!controls) return

        controls.target.lerp(dicePositionRef.current, 0.04)

        // Auto-zoom toward dice
        zoomDistRef.current += (2.2 - zoomDistRef.current) * 0.03
        controls.minDistance = zoomDistRef.current
        controls.maxDistance = zoomDistRef.current

        const dist = camera.position.distanceTo(controls.target)
        if (dist > 0.001) {
            const cosLimit = (0.05 - controls.target.y) / dist
            controls.maxPolarAngle = Math.acos(Math.max(-1, Math.min(1, cosLimit)))
        }

        controls.update()

        // Restore manual zoom range for user scrolling
        controls.minDistance = 1.5
        controls.maxDistance = 16
    })

    return (
        <>
            <Sky turbidity={6} rayleigh={0.4} sunPosition={[5, 12, 8]} />
            <Clouds limit={6} range={50} frustumCulled={false}>
                <Cloud position={[-10, 14, -8]} seed={1} segments={30} bounds={[6, 2, 6]} volume={4} opacity={0.7} speed={0.1} />
                <Cloud position={[8, 16, -12]} seed={2} segments={25} bounds={[5, 1.5, 5]} volume={3} opacity={0.6} speed={0.08} />
                <Cloud position={[0, 12, 14]} seed={3} segments={20} bounds={[4, 1.5, 4]} volume={2.5} opacity={0.5} speed={0.12} />
            </Clouds>

            {/* Daytime sky fill: cool blue sky + green felt bounce */}
            <hemisphereLight intensity={0.6} color="#b8d8f0" groundColor="#2b6b20" />

            {lightParams.sceneLightsEnabled && (
                <>
                    <ambientLight intensity={lightParams.ambientIntensity} />
                    <directionalLight
                        position={LIGHT_PRESET_POSITIONS[lightParams.lightPreset]}
                        intensity={lightParams.directIntensity}
                        color={lightParams.lightColor}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                        shadow-camera-near={0.5}
                        shadow-camera-far={40}
                        shadow-camera-left={-10}
                        shadow-camera-right={10}
                        shadow-camera-top={10}
                        shadow-camera-bottom={-10}
                    />
                    <directionalLight
                        position={[-5, 6, -4]}
                        intensity={lightParams.directIntensity * 0.45}
                        color={lightParams.lightColor}
                    />
                </>
            )}

            {/* Glass floor */}
            <RigidBody type="fixed" friction={params.friction} restitution={params.restitution}>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
                    <MeshReflectorMaterial
                        resolution={512}
                        mixBlur={0.8}
                        mixStrength={20}
                        roughness={0.08}
                        depthScale={0.6}
                        minDepthThreshold={0.6}
                        maxDepthThreshold={1.0}
                        color="#c8dde8"
                        metalness={0.1}
                        mirror={0.6}
                    />
                </mesh>
                <CuboidCollider args={[WALL_HALF, 0.05, WALL_HALF]} position={[0, -0.05, 0]} />
            </RigidBody>

            {/* Invisible boundary walls */}
            <RigidBody type="fixed" friction={0} restitution={0.5}>
                <CuboidCollider args={[WALL_HALF, WALL_H, 0.05]} position={[0, WALL_H, -WALL_HALF]} />
                <CuboidCollider args={[WALL_HALF, WALL_H, 0.05]} position={[0, WALL_H, WALL_HALF]} />
                <CuboidCollider args={[0.05, WALL_H, WALL_HALF]} position={[-WALL_HALF, WALL_H, 0]} />
                <CuboidCollider args={[0.05, WALL_H, WALL_HALF]} position={[WALL_HALF, WALL_H, 0]} />
            </RigidBody>

            {breakSnapshot ? (
                <DiceGlassFragments
                    snapshot={breakSnapshot}
                    params={params}
                    onSettled={() => onSettled({ position: [0, 0, 0], rotation: [0, 0, 0, 1] })}
                />
            ) : (
                <DicePhysicsObject
                    modelUrl={modelUrl}
                    params={params}
                    simState={simState}
                    bodyKey={bodyKey}
                    throwSpin={throwSpin}
                    externalSettledPose={externalSettledPose}
                    positionRef={dicePositionRef}
                    gltfLightsEnabled={lightParams.gltfLightsEnabled}
                    onDrop={onDrop}
                    onSettled={onSettled}
                    onBreak={onBreak}
                />
            )}

            <OrbitControls
                ref={controlsRef}
                enablePan={false}
                minDistance={1.5}
                maxDistance={16}
            />
        </>
    )
}

export const DiceScene: FC<DiceSceneProps> = (props) => {
    const { params, onDrop, fill } = props

    return (
        <div className={fill ? styles.viewportFill : styles.viewport}>
            <Canvas
                shadows
                gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1, antialias: true }}
                camera={{ position: [4, 2, 4], fov: 42, near: 0.1, far: 100 }}
            >
                <Physics gravity={[0, params.gravity, 0]}>
                    <SceneContent {...props} />
                </Physics>
            </Canvas>
        </div>
    )
}
