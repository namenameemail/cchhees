import { createContext, FC, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAssetsContext } from '../../../projects/assets/AssetsContext'
import {
    DEFAULT_DICE_LIGHT_PARAMS,
    DEFAULT_DICE_PHYSICS_PARAMS,
    DiceLightParams,
    DicePhysicsParams,
    DiceSimState,
} from './dicePhysics'
import { BreakSnapshot } from './glassFracture'
import { diceDebugLog } from './diceDebugLog'
import { DiceSettledPose } from './DicePhysicsObject'

interface DicePanelState extends DicePhysicsParams, DiceLightParams {
    modelAssetId: number | null
    builtinModelPath: string | null
}

const DEFAULT_STATE: DicePanelState = {
    ...DEFAULT_DICE_PHYSICS_PARAMS,
    ...DEFAULT_DICE_LIGHT_PARAMS,
    modelAssetId: null,
    builtinModelPath: null,
}

interface DiceContextValue {
    state: DicePanelState
    simState: DiceSimState
    modelUrl: string | null
    physicsParams: DicePhysicsParams
    lightParams: DiceLightParams
    bodyKey: number
    breakSnapshot: BreakSnapshot | null
    throwSpin: [number, number, number] | null
    handleDrop: () => void
    handleThrow: () => void
    handleExternalThrow: (spin: [number, number, number]) => void
    handleSettled: (pose: DiceSettledPose) => void
    handleBreak: (snapshot: BreakSnapshot) => void
    handleReset: () => void
    externalSettledPose: DiceSettledPose | null
    handleChange: (next: DicePanelState) => void
    subscribeToThrow: (fn: (spin: [number, number, number]) => void) => () => void
    subscribeToSettle: (fn: (pose: DiceSettledPose) => void) => () => void
    handleExternalSettle: (pose: DiceSettledPose) => void
    subscribeToModelChange: (fn: (modelAssetId: number | null, builtinModelPath: string | null) => void) => () => void
    handleExternalModelChange: (modelAssetId: number | null, builtinModelPath: string | null) => void
}

const DiceContext = createContext<DiceContextValue | null>(null)

export function useDiceContext(): DiceContextValue {
    const ctx = useContext(DiceContext)
    if (!ctx) throw new Error('useDiceContext must be used inside DiceProvider')
    return ctx
}

export const DiceProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { getAssetUrl } = useAssetsContext()
    const [state, setState] = useState<DicePanelState>(DEFAULT_STATE)
    const [simState, setSimState] = useState<DiceSimState>('idle')
    const [bodyKey, setBodyKey] = useState(0)
    const [breakSnapshot, setBreakSnapshot] = useState<BreakSnapshot | null>(null)
    const [throwSpin, setThrowSpin] = useState<[number, number, number] | null>(null)
    const throwListeners = useRef<Set<(spin: [number, number, number]) => void>>(new Set())
    const settleListeners = useRef<Set<(pose: DiceSettledPose) => void>>(new Set())
    const modelChangeListeners = useRef<Set<(modelAssetId: number | null, builtinModelPath: string | null) => void>>(new Set())
    const isLocalThrowRef = useRef(false)
    const [externalSettledPose, setExternalSettledPose] = useState<DiceSettledPose | null>(null)

    useEffect(() => {
        diceDebugLog.simState(simState)
    }, [simState])

    const modelUrl = useMemo(() => {
        if (state.builtinModelPath) return state.builtinModelPath
        if (state.modelAssetId != null) return getAssetUrl(state.modelAssetId) ?? null
        return null
    }, [state.builtinModelPath, state.modelAssetId, getAssetUrl])

    const physicsParams = useMemo<DicePhysicsParams>(() => ({
        gravity: state.gravity,
        mass: state.mass,
        restitution: state.restitution,
        friction: state.friction,
        linearDamping: state.linearDamping,
        angularDamping: state.angularDamping,
        spawnHeight: state.spawnHeight,
        spawnSpin: state.spawnSpin,
        glassBreak: state.glassBreak,
        glassCull: state.glassCull,
        modelScale: state.modelScale,
    }), [state])

    const lightParams = useMemo<DiceLightParams>(() => ({
        ambientIntensity: state.ambientIntensity,
        directIntensity: state.directIntensity,
        lightPreset: state.lightPreset,
        lightColor: state.lightColor,
        sceneLightsEnabled: state.sceneLightsEnabled,
        gltfLightsEnabled: state.gltfLightsEnabled,
    }), [state])

    const handleDrop = useCallback(() => {
        if (simState !== 'idle') return
        setSimState('running')
    }, [simState])

    const handleThrow = useCallback(() => {
        const spin: [number, number, number] = [
            (Math.random() - 0.5) * state.spawnSpin * 2,
            (Math.random() - 0.5) * state.spawnSpin * 2,
            (Math.random() - 0.5) * state.spawnSpin * 2,
        ]
        isLocalThrowRef.current = true
        setExternalSettledPose(null)
        setThrowSpin(spin)
        throwListeners.current.forEach(fn => fn(spin))
        setBreakSnapshot(null)
        setBodyKey(key => key + 1)
        setSimState('running')
    }, [state.spawnSpin])

    const handleExternalThrow = useCallback((spin: [number, number, number]) => {
        isLocalThrowRef.current = false
        setExternalSettledPose(null)
        setThrowSpin(spin)
        setBreakSnapshot(null)
        setBodyKey(key => key + 1)
        setSimState('running')
    }, [])

    const subscribeToThrow = useCallback((fn: (spin: [number, number, number]) => void) => {
        throwListeners.current.add(fn)
        return () => throwListeners.current.delete(fn)
    }, [])

    const handleSettled = useCallback((pose: DiceSettledPose) => {
        setSimState('settled')
        if (isLocalThrowRef.current) {
            settleListeners.current.forEach(fn => fn(pose))
        }
    }, [])

    const subscribeToSettle = useCallback((fn: (pose: DiceSettledPose) => void) => {
        settleListeners.current.add(fn)
        return () => settleListeners.current.delete(fn)
    }, [])

    const handleExternalSettle = useCallback((pose: DiceSettledPose) => {
        setExternalSettledPose(pose)
    }, [])

    const handleBreak = useCallback((snapshot: BreakSnapshot) => {
        setBreakSnapshot(snapshot)
        setSimState('broken')
    }, [])

    const handleReset = useCallback(() => {
        setSimState('idle')
        setBreakSnapshot(null)
        setExternalSettledPose(null)
        setBodyKey(key => key + 1)
    }, [])

    const handleChange = useCallback((next: DicePanelState) => {
        setState(prev => {
            if (prev.modelAssetId !== next.modelAssetId || prev.builtinModelPath !== next.builtinModelPath) {
                modelChangeListeners.current.forEach(fn => fn(next.modelAssetId, next.builtinModelPath))
            }
            return next
        })
        if (simState === 'idle') {
            setBodyKey(key => key + 1)
        }
    }, [simState])

    const handleExternalModelChange = useCallback((modelAssetId: number | null, builtinModelPath: string | null) => {
        setState(prev => ({ ...prev, modelAssetId, builtinModelPath }))
    }, [])

    const subscribeToModelChange = useCallback((fn: (modelAssetId: number | null, builtinModelPath: string | null) => void) => {
        modelChangeListeners.current.add(fn)
        return () => modelChangeListeners.current.delete(fn)
    }, [])

    const value = useMemo<DiceContextValue>(() => ({
        state,
        simState,
        modelUrl,
        physicsParams,
        lightParams,
        bodyKey,
        breakSnapshot,
        throwSpin,
        externalSettledPose,
        handleDrop,
        handleThrow,
        handleExternalThrow,
        handleSettled,
        handleBreak,
        handleReset,
        handleChange,
        subscribeToThrow,
        subscribeToSettle,
        handleExternalSettle,
        subscribeToModelChange,
        handleExternalModelChange,
    }), [state, simState, modelUrl, physicsParams, lightParams, bodyKey, breakSnapshot,
        throwSpin, externalSettledPose, handleDrop, handleThrow, handleExternalThrow,
        handleSettled, handleBreak, handleReset, handleChange, subscribeToThrow,
        subscribeToSettle, handleExternalSettle, subscribeToModelChange, handleExternalModelChange])

    return <DiceContext.Provider value={value}>{children}</DiceContext.Provider>
}

export type { DicePanelState }
