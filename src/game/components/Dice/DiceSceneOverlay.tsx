import { FC } from 'react'
import { DiceScene } from './DiceScene'
import { useDiceContext } from './DiceContext'

export const DiceSceneOverlay: FC = () => {
    const {
        modelUrl,
        physicsParams,
        lightParams,
        simState,
        bodyKey,
        breakSnapshot,
        throwSpin,
        externalSettledPose,
        handleThrow,
        handleSettled,
        handleBreak,
    } = useDiceContext()

    return (
        <DiceScene
            modelUrl={modelUrl}
            params={physicsParams}
            lightParams={lightParams}
            simState={simState}
            bodyKey={bodyKey}
            breakSnapshot={breakSnapshot}
            throwSpin={throwSpin ?? undefined}
            externalSettledPose={externalSettledPose}
            onDrop={handleThrow}
            onSettled={handleSettled}
            onBreak={handleBreak}
            fill
        />
    )
}
