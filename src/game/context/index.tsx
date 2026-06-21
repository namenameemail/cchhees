import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultGameContextValue } from '../utils'
import { GameContextValue } from './types'
import { FigureId, FigureMoveRule, FigureMoveDirection, FigurePlacement, FigureViewParams, FigureCatalog } from '../types/figures'
import { FigureEventRule } from '../types/events'
import {
    createNewFigureDefinition,
    cloneFigureState,
    createFigurePlacement,
    normalizeFigurePlacement,
    normalizeFigureMoveDirection,
    updateFigureCatalogStateAtIndex,
} from '../figureView'
import { removeFigureFromBoard, removeFigureReferencesFromBoardEventRules } from '../state/figureReferences'
import {
    getTopOfStack,
    getCellStack,
    isStackOccupied,
    pushToStack,
    removePlacementFromBoard,
} from '../figureStack'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import { ActiveBoardPersistPayload } from '../../projects/projectPersist'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { normalizeBoardFigureAnimationSettings } from '../figureAnimation/resolveFigureAnimationSettings'
import { resolveCanStepOnOwnTeam, resolveJumpOverPieces } from '../moveRules'
import { ConnectionParams } from '../types/connections'
import { BoardStyleRule } from '../types/styleRules'
import { cellParametersBrushStateInitialValue, connectionParamsBrushStateInitialValue } from './constants'
import { migrateBoardAndCatalogEventRules } from '../state/boardEventRules'
import {
    FiguresSlice,
    BoardSlice,
    composeGameState,
    createInitialFiguresSliceFromState,
    createInitialBoardSliceFromState,
    cloneFigureCatalog,
} from '../state/slices'
import {
    cloneFiguresSlice,
    cloneBoardSlice,
    countFiguresOutsideGrid,
    isGridShrink,
} from '../state/reconcile'
import { ShrinkBoardWarningModal } from '../components/ShrinkBoardWarningModal'
import { CellCoord, coordKey, coordsEqual, indexToCoord, isCoordInGrid } from '../types/coords'
import {
    clearAssetIdFromBoardParameters,
    clearAssetIdFromCellParameters,
    clearAssetIdFromFigureViewParams,
} from '../../projects/assets/assetReferences'
import { CollabOp } from '../../collab/ops'
import { historyPush } from './history'
import { selectionDebugLog } from '../selectionDebugLog'
import { setProfilerPanelChannel } from '../../profiler'
import { applyRemotePersistDataFromProject } from './remotePersist'
import { useGameAnimation } from './useGameAnimation'
import { useGameCollabSync } from './useGameCollabSync'
import { useSliceMutations } from './useSliceMutations'
import { useFigureMove } from './useFigureMove'
import { isKeyboardTargetEditable } from '../keyboard'

export { applyRemotePersistDataFromProject } from './remotePersist'

export const GameContext = React.createContext<GameContextValue>(defaultGameContextValue)

export interface GameProviderProps {
    children: React.ReactNode
    activeBoardId: string
    initialState: GameState
    initialCatalog: FigureCatalog
    initialFiguresHistory: SliceHistory<FiguresSlice>
    initialBoardHistory: SliceHistory<BoardSlice>
    initialCatalogHistory: SliceHistory<FigureCatalog>
    onPersist?: (data: ActiveBoardPersistPayload) => void
    onCollabOp?: (op: CollabOp | CollabOp[]) => void
}

export function GameProvider({
    children,
    activeBoardId,
    initialState,
    initialCatalog,
    initialFiguresHistory,
    initialBoardHistory,
    initialCatalogHistory,
    onPersist,
    onCollabOp,
}: GameProviderProps) {
    const activeBoardIdRef = useRef(activeBoardId)
    activeBoardIdRef.current = activeBoardId

    const [figuresSlice, setFiguresSlice] = useState<FiguresSlice>(() =>
        createInitialFiguresSliceFromState(initialState),
    )
    const [boardSlice, setBoardSlice] = useState<BoardSlice>(() => {
        const { board, catalog } = migrateBoardAndCatalogEventRules(
            createInitialBoardSliceFromState(initialState),
            cloneFigureCatalog(initialCatalog),
        )
        return board
    })
    const [figureCatalog, setFigureCatalog] = useState<FigureCatalog>(() => {
        const { catalog } = migrateBoardAndCatalogEventRules(
            createInitialBoardSliceFromState(initialState),
            cloneFigureCatalog(initialCatalog),
        )
        return catalog
    })
    const [figuresHistory, setFiguresHistory] = useState(initialFiguresHistory)
    const [boardHistory, setBoardHistory] = useState(initialBoardHistory)
    const [catalogHistory, setCatalogHistory] = useState(initialCatalogHistory)

    const [state, setState] = useState<GameState>(() =>
        composeGameState(
            createInitialFiguresSliceFromState(initialState),
            createInitialBoardSliceFromState(initialState),
            initialCatalog,
        ),
    )

    const [mode, setMode] = useState<Mode>(Mode.Game)
    const [activeCell, setActiveCellState] = useState<CellCoord | undefined>(undefined)

    useEffect(() => {
        if (import.meta.env.DEV) {
            setProfilerPanelChannel(mode === Mode.Game ? 'gameplay' : 'scroll')
        }
    }, [mode])
    const [activeFigure, setActiveFigure] = useState<FigureId | undefined>(undefined)
    const [figureStateIndexById, setFigureStateIndexById] = useState<Partial<Record<FigureId, number>>>({})
    const [isArrangeMode, setIsArrangeMode] = useState(false)
    const [isFreeMoveEnabled, setIsFreeMoveEnabled] = useState(false)

    const [previewCellStyleRuleIndex, setPreviewCellStyleRuleIndex] = useState<number | undefined>(undefined)

    const isFigureArrangeEnabled = useCallback(
        (_figureId: FigureId) => isArrangeMode,
        [isArrangeMode],
    )

    const toggleFigureArrange = useCallback((_figureId: FigureId) => {
        setIsArrangeMode(prev => {
            if (!prev) {
                setIsFreeMoveEnabled(false)
            }

            return !prev
        })
    }, [])

    const toggleFreeMove = useCallback(() => {
        setIsFreeMoveEnabled(prev => {
            const next = !prev

            if (next) {
                setIsArrangeMode(false)
                setMode(Mode.Game)
            }

            return next
        })
    }, [setMode])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
                return
            }

            if (isKeyboardTargetEditable(event.target)) {
                return
            }

            const key = event.key.toLowerCase()

            if (key === 'e') {
                event.preventDefault()
                toggleFreeMove()
                return
            }

            if (key === 'r') {
                event.preventDefault()
                toggleFigureArrange(activeFigure ?? '')
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeFigure, toggleFigureArrange, toggleFreeMove])

    const getFigureStateIndex = useCallback((figureId: FigureId) => {
        return figureStateIndexById[figureId] ?? 0
    }, [figureStateIndexById])

    const setFigureStateIndex = useCallback((figureId: FigureId, stateIndex: number) => {
        setFigureStateIndexById(prev => ({
            ...prev,
            [figureId]: Math.max(0, Math.trunc(stateIndex)),
        }))
    }, [])

    const setActiveCell = useCallback((value: CellCoord | undefined, reason = 'unknown') => {
        setActiveCellState(previous => {
            const unchanged = previous === undefined && value === undefined
                || (previous !== undefined && value !== undefined && coordsEqual(previous, value))

            if (!unchanged) {
                selectionDebugLog.activeCell(value, reason, previous)
            }

            return value
        })
    }, [])

    const [cellParametersBrushState, setCellParametersBrushState] = useState<CellParameters>(
        cellParametersBrushStateInitialValue,
    )
    const [connectionParamsBrushState, setConnectionParamsBrushState] = useState<ConnectionParams>(
        connectionParamsBrushStateInitialValue,
    )

    const [shrinkWarningOpen, setShrinkWarningOpen] = useState(false)
    const [shrinkWarningCount, setShrinkWarningCount] = useState(0)
    const [boardParametersFormKey, setBoardParametersFormKey] = useState(0)
    const pendingBoardParametersRef = useRef<BoardParameters | null>(null)

    const clearActiveCellIfInvalid = useCallback((n: number, m: number, cell?: CellCoord) => {
        const active = cell ?? activeCell
        if (active !== undefined && !isCoordInGrid(active, n, m)) {
            selectionDebugLog.cleared('outside grid after board change', active)
            setActiveCell(undefined, 'outside grid after board change')
        }
    }, [activeCell, setActiveCell])

    const animation = useGameAnimation(figuresSlice, boardSlice.boardParameters, mode, activeBoardId)

    const {
        displayFiguresSlice,
        isFigureAnimating,
        figureBoardAnimations,
        isMoveAnimatingRef,
        prevFiguresSliceRef,
        skipFigureAnimationRef,
        playFigureStepSequenceLocal,
    } = animation

    const {
        emitCollabOp,
        applyRemotePersistData,
        applyRemoteOps,
        notifyPersistIfNeeded,
    } = useGameCollabSync({
        activeBoardIdRef,
        onPersist,
        onCollabOp,
        state,
        figuresHistory,
        boardHistory,
        figureCatalog,
        catalogHistory,
        figuresSlice,
        boardSlice,
        setFiguresSlice,
        setBoardSlice,
        setFigureCatalog,
        setFiguresHistory,
        setBoardHistory,
        setCatalogHistory,
        setState,
        skipFigureAnimationRef,
    })

    const {
        pushFiguresChange,
        applyBoardChange,
        applyCatalogChange,
        undoFigures,
        redoFigures,
        undoBoard,
        redoBoard,
    } = useSliceMutations({
        activeBoardIdRef,
        figuresSlice,
        boardSlice,
        figureCatalog,
        figuresHistory,
        boardHistory,
        catalogHistory,
        setFiguresSlice,
        setBoardSlice,
        setFigureCatalog,
        setFiguresHistory,
        setBoardHistory,
        setCatalogHistory,
        setState,
        clearActiveCellIfInvalid,
        emitCollabOp,
    })

    useEffect(() => {
        notifyPersistIfNeeded()
    }, [notifyPersistIfNeeded])

    const moveActiveCellFigureTo = useFigureMove({
        mode,
        activeCell,
        figuresSlice,
        figureCatalog,
        eventRules: boardSlice.eventRules ?? [],
        boardParameters: state.boardParameters,
        isFigureAnimating,
        isMoveAnimatingRef,
        prevFiguresSliceRef,
        setActiveCell,
        pushFiguresChange,
        playFigureStepSequenceLocal,
        freeMove: isFreeMoveEnabled,
    })

    const setBoardParameters = useCallback((value: BoardParameters) => {
        const normalizedValue: BoardParameters = {
            ...value,
            figureAnimation: normalizeBoardFigureAnimationSettings(value.figureAnimation),
        }

        const nextBoard: BoardSlice = {
            ...boardSlice,
            boardParameters: normalizedValue,
        }

        const shrinking = isGridShrink(boardSlice.boardParameters, normalizedValue)
        const outsideCount = countFiguresOutsideGrid(figuresSlice, normalizedValue.n, normalizedValue.m)

        if (shrinking && outsideCount > 0) {
            pendingBoardParametersRef.current = normalizedValue
            setShrinkWarningCount(outsideCount)
            setShrinkWarningOpen(true)
            setBoardParametersFormKey(key => key + 1)
            return
        }

        applyBoardChange(nextBoard, true, { kind: 'board-parameters', boardId: activeBoardIdRef.current, boardParameters: normalizedValue })
    }, [boardSlice, figuresSlice, applyBoardChange])

    const confirmShrinkBoard = useCallback(() => {
        const pending = pendingBoardParametersRef.current
        if (!pending) {
            setShrinkWarningOpen(false)
            return
        }

        pendingBoardParametersRef.current = null
        setShrinkWarningOpen(false)
        applyBoardChange({
            ...boardSlice,
            boardParameters: pending,
        }, true, { kind: 'board-parameters', boardId: activeBoardIdRef.current, boardParameters: pending })
    }, [boardSlice, applyBoardChange])

    const cancelShrinkBoard = useCallback(() => {
        pendingBoardParametersRef.current = null
        setShrinkWarningOpen(false)
        setShrinkWarningCount(0)
        setBoardParametersFormKey(key => key + 1)
    }, [])

    const setStyleRules = useCallback((value: BoardStyleRule[]) => {
        applyBoardChange({
            ...boardSlice,
            styleRules: value,
        }, true, { kind: 'style-rules', boardId: activeBoardIdRef.current, styleRules: value })
    }, [boardSlice, applyBoardChange])

    const toTray = useCallback((coord: CellCoord) => {
        const topFigure = getTopOfStack(figuresSlice, coord)
        if (!topFigure) {
            return
        }

        pushFiguresChange({
            ...removePlacementFromBoard(figuresSlice, topFigure, coord),
            tray: [topFigure, ...figuresSlice.tray],
        })
    }, [figuresSlice, pushFiguresChange])

    const replace = useCallback((coord: CellCoord, figure: FigureId, stateIndex?: number) => {
        const topFigure = getTopOfStack(figuresSlice, coord)
        if (!topFigure) {
            return
        }

        const withoutTop = removePlacementFromBoard(figuresSlice, topFigure, coord)

        pushFiguresChange({
            ...pushToStack(withoutTop, coord, createFigurePlacement(figure, stateIndex)),
            tray: [topFigure, ...figuresSlice.tray],
        })
    }, [figuresSlice, pushFiguresChange])

    const setFigure = useCallback((coord: CellCoord, figure: FigureId, stateIndex?: number) => {
        pushFiguresChange(
            pushToStack(figuresSlice, coord, createFigurePlacement(figure, stateIndex)),
        )
    }, [figuresSlice, pushFiguresChange])

    const setCellFigure = useCallback((coord: CellCoord, figure: FigureId) => {
        const stateIndex = figureStateIndexById[figure] ?? 0

        if (isStackOccupied(figuresSlice, coord)) {
            replace(coord, figure, stateIndex)
        } else {
            setFigure(coord, figure, stateIndex)
        }
    }, [figuresSlice, replace, setFigure, figureStateIndexById])

    const setCellParameters = useCallback((coord: CellCoord) => {
        const key = coordKey(coord)
        applyBoardChange({
            ...boardSlice,
            cellParametersByCoord: {
                ...boardSlice.cellParametersByCoord,
                [key]: cellParametersBrushState,
            },
        }, true, {
            kind: 'cell-parameters',
            boardId: activeBoardIdRef.current,
            coordKey: key,
            parameters: cellParametersBrushState,
        })
    }, [boardSlice, cellParametersBrushState, applyBoardChange])

    const setTray = useCallback((value: FigurePlacement[]) => {
        pushFiguresChange({
            ...figuresSlice,
            tray: value,
        })
    }, [figuresSlice, pushFiguresChange])

    const setFigureStateViewParams = useCallback((
        figureId: FigureId,
        stateIndex: number,
        params: FigureViewParams,
    ) => {
        applyCatalogChange(
            updateFigureCatalogStateAtIndex(figureCatalog, figureId, stateIndex, state => ({
                ...state,
                viewParams: params,
            })),
            true,
            { kind: 'figure-view-params', figureId, stateIndex, viewParams: params },
        )
    }, [figureCatalog, applyCatalogChange])

    const setFigureStateMoveRules = useCallback((
        figureId: FigureId,
        stateIndex: number,
        moveRules: FigureMoveRule[],
        jumpOverPieces?: boolean,
        canStepOnOwnTeam?: boolean,
    ) => {
        const entry = figureCatalog.find(item => item.id === figureId)
        const currentState = entry?.states[Math.min(Math.max(0, stateIndex), (entry?.states.length ?? 1) - 1)]

        applyCatalogChange(
            updateFigureCatalogStateAtIndex(figureCatalog, figureId, stateIndex, state => ({
                ...state,
                moveRules,
                jumpOverPieces: jumpOverPieces ?? resolveJumpOverPieces(state),
                canStepOnOwnTeam: canStepOnOwnTeam ?? resolveCanStepOnOwnTeam(state),
            })),
            true,
            {
                kind: 'figure-move-rules',
                figureId,
                stateIndex,
                moveRules,
                jumpOverPieces: jumpOverPieces ?? (currentState ? resolveJumpOverPieces(currentState) : true),
                canStepOnOwnTeam: canStepOnOwnTeam ?? (currentState ? resolveCanStepOnOwnTeam(currentState) : false),
            },
        )
    }, [figureCatalog, applyCatalogChange])

    const addFigureState = useCallback((figureId: FigureId) => {
        const entry = figureCatalog.find(item => item.id === figureId)

        if (!entry?.states.length) {
            return
        }

        const nextStates = [
            ...entry.states,
            cloneFigureState(entry.states[0]),
        ]

        applyCatalogChange(
            figureCatalog.map(item => (
                item.id === figureId
                    ? { ...item, states: nextStates }
                    : item
            )),
            true,
            { kind: 'figure-states', figureId, states: nextStates },
        )
    }, [figureCatalog, applyCatalogChange])

    const removeFigureState = useCallback((figureId: FigureId, stateIndex: number) => {
        if (stateIndex <= 0) {
            return
        }

        const entry = figureCatalog.find(item => item.id === figureId)

        if (!entry || entry.states.length <= 1 || stateIndex >= entry.states.length) {
            return
        }

        const nextStates = entry.states.filter((_, index) => index !== stateIndex)

        applyCatalogChange(
            figureCatalog.map(item => (
                item.id === figureId
                    ? { ...item, states: nextStates }
                    : item
            )),
            true,
            { kind: 'figure-states', figureId, states: nextStates },
        )
    }, [figureCatalog, applyCatalogChange])

    const setFigureTeam = useCallback((figureId: FigureId, team: number | undefined) => {
        const normalizedTeam = team === undefined || !Number.isFinite(team)
            ? undefined
            : Math.trunc(team)

        applyCatalogChange(
            figureCatalog.map(item => {
                if (item.id !== figureId) {
                    return item
                }

                if (normalizedTeam === undefined) {
                    const { team: _removed, ...rest } = item
                    return rest
                }

                return { ...item, team: normalizedTeam }
            }),
            true,
            { kind: 'figure-team', figureId, team: normalizedTeam },
        )
    }, [figureCatalog, applyCatalogChange])

    const setFigureMoveDirection = useCallback((figureId: FigureId, moveDirection: FigureMoveDirection) => {
        const normalizedDirection = normalizeFigureMoveDirection(moveDirection)

        applyCatalogChange(
            figureCatalog.map(item => {
                if (item.id !== figureId) {
                    return item
                }

                if (normalizedDirection === 'up') {
                    const { moveDirection: _removed, ...rest } = item
                    return rest
                }

                return { ...item, moveDirection: normalizedDirection }
            }),
            true,
            {
                kind: 'figure-move-direction',
                figureId,
                moveDirection: normalizedDirection === 'up' ? undefined : normalizedDirection,
            },
        )
    }, [figureCatalog, applyCatalogChange])

    const setBoardEventRules = useCallback((eventRules: FigureEventRule[]) => {
        applyBoardChange(
            {
                ...boardSlice,
                eventRules,
            },
            true,
            { kind: 'board-event-rules', boardId: activeBoardIdRef.current, eventRules },
        )
    }, [boardSlice, applyBoardChange])

    const addFigure = useCallback(() => {
        const newFigure = createNewFigureDefinition()

        applyCatalogChange(
            [newFigure, ...figureCatalog],
            true,
            { kind: 'figure-add', figure: newFigure },
        )

        setActiveFigure(newFigure.id)
    }, [figureCatalog, applyCatalogChange, setActiveFigure])

    const removeFigure = useCallback((figureId: FigureId) => {
        const filteredCatalog = figureCatalog.filter(entry => entry.id !== figureId)
        if (filteredCatalog.length === figureCatalog.length) {
            return
        }

        const nextFigures = cloneFiguresSlice(removeFigureFromBoard(figuresSlice, figureId))
        const nextCatalog = filteredCatalog
        const nextEventRules = removeFigureReferencesFromBoardEventRules(boardSlice, figureId)
        const nextBoard = {
            ...boardSlice,
            eventRules: nextEventRules,
        }

        const catalogResult = historyPush(catalogHistory, figureCatalog, cloneFigureCatalog(nextCatalog))
        const figuresResult = historyPush(figuresHistory, figuresSlice, nextFigures)
        const boardResult = historyPush(boardHistory, boardSlice, cloneBoardSlice(nextBoard))

        setCatalogHistory(catalogResult.history)
        setFigureCatalog(catalogResult.current)
        setFiguresHistory(figuresResult.history)
        setFiguresSlice(figuresResult.current)
        setBoardHistory(boardResult.history)
        setBoardSlice(boardResult.current)
        setState(composeGameState(figuresResult.current, boardResult.current, catalogResult.current))
        emitCollabOp({ kind: 'figure-remove', figureId })

        if (activeFigure === figureId) {
            setActiveFigure(undefined)
        }
    }, [figureCatalog, catalogHistory, boardSlice, boardHistory, figuresSlice, figuresHistory, activeFigure, emitCollabOp])

    const setCells = useCallback((value: GameState['cells']) => {
        const { n } = state.boardParameters
        const figuresByCoord: FiguresSlice['figuresByCoord'] = {}
        value.forEach((cell, index) => {
            const stack = getCellStack(cell).map(item => normalizeFigurePlacement(item))

            if (stack.length > 0) {
                figuresByCoord[coordKey(indexToCoord(index, n))] = stack
            }
        })
        pushFiguresChange({
            figuresByCoord,
            tray: figuresSlice.tray,
        })
    }, [figuresSlice, state.boardParameters.n, pushFiguresChange])

    const clearAssetReferences = useCallback((assetId: number) => {
        const nextCellParametersByCoord: BoardSlice['cellParametersByCoord'] = {}
        let cellParamsChanged = false

        for (const [key, params] of Object.entries(boardSlice.cellParametersByCoord)) {
            const nextParams = clearAssetIdFromCellParameters(params, assetId)
            nextCellParametersByCoord[key] = nextParams ?? params
            if (nextParams !== params) {
                cellParamsChanged = true
            }
        }

        const nextStyleRules = boardSlice.styleRules.map(rule => {
            if (rule.kind !== 'cell') {
                return rule
            }

            const nextCellParams = clearAssetIdFromCellParameters(rule.cellParams, assetId)

            if (nextCellParams === rule.cellParams) {
                return rule
            }

            cellParamsChanged = true

            return {
                ...rule,
                cellParams: nextCellParams ?? rule.cellParams,
            }
        })

        const nextBrushState = clearAssetIdFromCellParameters(cellParametersBrushState, assetId)
        if (nextBrushState !== cellParametersBrushState) {
            setCellParametersBrushState(nextBrushState ?? cellParametersBrushState)
        }

        let figureDefsChanged = false
        const nextFigureCatalog = figureCatalog.map(entry => {
            let entryChanged = false
            const nextStates = entry.states.map(state => {
                const nextParams = clearAssetIdFromFigureViewParams(state.viewParams, assetId)
                if (nextParams === state.viewParams) {
                    return state
                }
                entryChanged = true
                return {
                    ...state,
                    viewParams: nextParams ?? state.viewParams,
                }
            })

            if (!entryChanged) {
                return entry
            }

            figureDefsChanged = true
            return { ...entry, states: nextStates }
        })

        const nextBoardParameters = clearAssetIdFromBoardParameters(boardSlice.boardParameters, assetId)
        const boardParamsChanged = nextBoardParameters !== boardSlice.boardParameters

        if (!cellParamsChanged && !figureDefsChanged && !boardParamsChanged) {
            return
        }

        if (cellParamsChanged || boardParamsChanged) {
            const nextBoard = {
                ...boardSlice,
                cellParametersByCoord: nextCellParametersByCoord,
                styleRules: nextStyleRules,
                boardParameters: nextBoardParameters,
            }

            applyBoardChange(nextBoard, true, {
                kind: 'board-sync',
                boardId: activeBoardIdRef.current,
                board: nextBoard,
            })
        }

        if (figureDefsChanged) {
            applyCatalogChange(nextFigureCatalog, true, {
                kind: 'catalog-sync',
                catalog: nextFigureCatalog,
            })
        }
    }, [boardSlice, figureCatalog, cellParametersBrushState, applyBoardChange, applyCatalogChange])

    const contextFiguresSlice = useMemo(
        () => displayFiguresSlice ?? figuresSlice,
        [displayFiguresSlice, figuresSlice],
    )

    const contextState = useMemo(() => {
        if (displayFiguresSlice) {
            return composeGameState(displayFiguresSlice, boardSlice, figureCatalog)
        }

        return state
    }, [displayFiguresSlice, state, boardSlice, figureCatalog])

    const value = useMemo(
        () => ({
            mode,
            setMode,
            state: contextState,
            figuresSlice: contextFiguresSlice,
            figuresHistory,
            boardHistory,
            figureCatalog,
            catalogHistory,
            undoFigures,
            redoFigures,
            undoBoard,
            redoBoard,
            cellParametersBrushState,
            setCellParametersBrushState,
            connectionParamsBrushState,
            setConnectionParamsBrushState,
            activeFigure,
            setActiveFigure,
            getFigureStateIndex,
            setFigureStateIndex,
            isFigureArrangeEnabled,
            toggleFigureArrange,
            isFreeMoveEnabled,
            toggleFreeMove,
            activeCell,
            setActiveCell,
            previewCellStyleRuleIndex,
            setPreviewCellStyleRuleIndex,
            moveActiveCellFigureTo,
            setCellFigure,
            setCellParameters,
            toTray,
            setBoardParameters,
            boardParametersFormKey,
            setStyleRules,
            setTray,
            setCells,
            setFigureStateViewParams,
            setFigureStateMoveRules,
            addFigureState,
            removeFigureState,
            setFigureTeam,
            setFigureMoveDirection,
            setBoardEventRules,
            addFigure,
            removeFigure,
            clearAssetReferences,
            applyRemotePersistData,
            applyRemoteOps,
            isFigureAnimating,
            figureBoardAnimations,
        }),
        [
            mode,
            contextState,
            contextFiguresSlice,
            figuresHistory,
            boardHistory,
            figureCatalog,
            catalogHistory,
            undoFigures,
            redoFigures,
            undoBoard,
            redoBoard,
            cellParametersBrushState,
            connectionParamsBrushState,
            activeFigure,
            isFigureArrangeEnabled,
            toggleFigureArrange,
            isFreeMoveEnabled,
            toggleFreeMove,
            getFigureStateIndex,
            setFigureStateIndex,
            activeCell,
            previewCellStyleRuleIndex,
            moveActiveCellFigureTo,
            setCellFigure,
            setCellParameters,
            toTray,
            setBoardParameters,
            boardParametersFormKey,
            setStyleRules,
            setTray,
            setCells,
            setFigureStateViewParams,
            setFigureStateMoveRules,
            addFigureState,
            removeFigureState,
            setFigureTeam,
            setFigureMoveDirection,
            setBoardEventRules,
            addFigure,
            removeFigure,
            clearAssetReferences,
            applyRemotePersistData,
            applyRemoteOps,
            isFigureAnimating,
            figureBoardAnimations,
        ],
    )

    return (
        <GameContext.Provider value={value}>
            {children}
            <ShrinkBoardWarningModal
                open={shrinkWarningOpen}
                count={shrinkWarningCount}
                onConfirm={confirmShrinkBoard}
                onCancel={cancelShrinkBoard}
            />
        </GameContext.Provider>
    )
}

export const useGameContext = () => React.useContext(GameContext)
