import { FC, useCallback, useMemo, useState } from 'react'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig, ParameterTypes } from '../../../components/Form1/types'
import { ProjectModelSelect } from '../../../projects/components/ProjectModelSelect'
import { useAssetsContext } from '../../../projects/assets/AssetsContext'
import { DiceScene } from './DiceScene'
import {
    DEFAULT_DICE_PHYSICS_PARAMS,
    DicePhysicsParams,
    DiceSimState,
} from './dicePhysics'
import styles from './DicePanel.module.css'

interface DicePanelState extends DicePhysicsParams {
    modelAssetId: number | null
}

const DEFAULT_STATE: DicePanelState = {
    ...DEFAULT_DICE_PHYSICS_PARAMS,
    modelAssetId: null,
}

const ModelAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => (
    <ProjectModelSelect
        name={name}
        value={typeof value === 'number' ? value : null}
        onChange={(assetId) => onChange(name, assetId)}
        placeholder="builtin dice"
        clearable
        clearTitle="Встроенный кубик"
    />
)

const dicePanelConfig: Form1FieldConfig<DicePanelState>[] = [
    {
        name: 'modelAssetId',
        label: 'glb',
        Component: ModelAssetSelectField,
    },
    {
        name: 'gravity',
        label: 'g',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'gravity', step: 0.1 },
    },
    {
        name: 'mass',
        label: 'm',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'mass', step: 0.1, min: 0.01 },
    },
    {
        name: 'restitution',
        label: 're',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'restitution', step: 0.05, min: 0, max: 1 },
    },
    {
        name: 'friction',
        label: 'fr',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'friction', step: 0.05, min: 0 },
    },
    {
        name: 'linearDamping',
        label: 'ld',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'linear damping', step: 0.01, min: 0 },
    },
    {
        name: 'angularDamping',
        label: 'ad',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'angular damping', step: 0.01, min: 0 },
    },
    {
        name: 'spawnHeight',
        label: 'h',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'spawn height', step: 0.1, min: 0.5 },
    },
    {
        name: 'spawnSpin',
        label: 'sp',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'spawn spin', step: 0.5, min: 0 },
    },
]

const STATUS_LABELS: Record<DiceSimState, string> = {
    idle: 'Готов к броску',
    running: 'Падение...',
    settled: 'Остановился',
}

export const DicePanel: FC = () => {
    const { getAssetUrl } = useAssetsContext()
    const [state, setState] = useState<DicePanelState>(DEFAULT_STATE)
    const [simState, setSimState] = useState<DiceSimState>('idle')
    const [bodyKey, setBodyKey] = useState(0)

    const modelUrl = useMemo(() => {
        if (state.modelAssetId == null) {
            return null
        }
        return getAssetUrl(state.modelAssetId) ?? null
    }, [state.modelAssetId, getAssetUrl])

    const physicsParams = useMemo<DicePhysicsParams>(() => ({
        gravity: state.gravity,
        mass: state.mass,
        restitution: state.restitution,
        friction: state.friction,
        linearDamping: state.linearDamping,
        angularDamping: state.angularDamping,
        spawnHeight: state.spawnHeight,
        spawnSpin: state.spawnSpin,
    }), [state])

    const handleDrop = useCallback(() => {
        if (simState !== 'idle') {
            return
        }
        setSimState('running')
    }, [simState])

    const handleSettled = useCallback(() => {
        setSimState('settled')
    }, [])

    const handleReset = useCallback(() => {
        setSimState('idle')
        setBodyKey(key => key + 1)
    }, [])

    const handleChange = useCallback((next: DicePanelState) => {
        setState(next)
        if (simState === 'idle') {
            setBodyKey(key => key + 1)
        }
    }, [simState])

    return (
        <div className={styles.root}>
            <DiceScene
                modelUrl={modelUrl}
                params={physicsParams}
                simState={simState}
                bodyKey={bodyKey}
                onDrop={handleDrop}
                onSettled={handleSettled}
            />

            <div className={styles.controls}>
                <div className={styles.hint}>
                    Кликните по сцене, чтобы бросить объект.
                </div>
                <div className={styles.status}>{STATUS_LABELS[simState]}</div>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.resetButton}
                        onClick={handleReset}
                        disabled={simState === 'idle'}
                    >
                        Сброс
                    </button>
                </div>
                <Form1
                    value={state}
                    config={dicePanelConfig}
                    onChange={handleChange}
                    fieldLayout="labeledColumn"
                />
            </div>
        </div>
    )
}
