import { FC } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { DicePhysicsObject } from './DicePhysicsObject'
import { DicePhysicsParams, DiceSimState } from './dicePhysics'
import styles from './DicePanel.module.css'

interface DiceSceneProps {
    modelUrl: string | null
    params: DicePhysicsParams
    simState: DiceSimState
    bodyKey: number
    onDrop: () => void
    onSettled: () => void
}

function SceneContent({
    modelUrl,
    params,
    simState,
    bodyKey,
    onDrop,
    onSettled,
}: DiceSceneProps) {
    return (
        <>
            <ambientLight intensity={0.55} />
            <directionalLight
                position={[5, 8, 4]}
                intensity={1.1}
                castShadow
            />

            <RigidBody type="fixed" friction={params.friction} restitution={params.restitution}>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <planeGeometry args={[12, 12]} />
                    <meshStandardMaterial color="#4a4a52" transparent opacity={0.92} />
                </mesh>
                <CuboidCollider args={[6, 0.05, 6]} position={[0, -0.05, 0]} />
            </RigidBody>

            <DicePhysicsObject
                modelUrl={modelUrl}
                params={params}
                simState={simState}
                bodyKey={bodyKey}
                onDrop={onDrop}
                onSettled={onSettled}
            />

            <OrbitControls
                target={[0, 0, 0]}
                enablePan={false}
                minDistance={2}
                maxDistance={14}
            />
        </>
    )
}

export const DiceScene: FC<DiceSceneProps> = (props) => {
    const { params, simState, onDrop } = props

    return (
        <div className={styles.viewport}>
            <Canvas
                shadows
                camera={{ position: [4, 3.5, 4], fov: 45, near: 0.1, far: 100 }}
                onPointerMissed={() => {
                    if (simState === 'idle') {
                        onDrop()
                    }
                }}
            >
                <color attach="background" args={['#2a2a2e']} />
                <Physics gravity={[0, params.gravity, 0]}>
                    <SceneContent {...props} />
                </Physics>
            </Canvas>
        </div>
    )
}
