import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultGameContextValue } from '../utils'
import { historyPush, historyRedo, historyUndo } from './history'
import { GameContextValue } from './types'
import { FigureId, FigureMoveRule, FigureViewParams, FigureCatalog } from '../types/figures'
import { createNewFigureDefinition, cloneFigureState, resolveFigureDefinition, updateFigureCatalogStateAtIndex } from '../figureView'
import { isFigureMoveAllowed } from '../moveRules'
import { removeFigureFromBoard } from '../state/figureReferences'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import { ProjectPersistData } from '../../projects/types'
import { ActiveBoardPersistPayload } from '../../projects/projectPersist'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { ConnectionParams } from '../types/connections'
import { BoardStyleRule } from '../types/styleRules'
import { cellParametersBrushStateInitialValue, connectionParamsBrushStateInitialValue } from './constants'
import {
    BoardSlice,
    FiguresSlice,
    composeGameState,
    createInitialBoardSliceFromState,
    createInitialFiguresSliceFromState,
    cloneFigureCatalog,
} from '../state/slices'
import {
    cloneBoardSlice,
    cloneFiguresSlice,
    countFiguresOutsideGrid,
    isGridShrink,
    pruneCellParameters,
    pruneFigures,
} from '../state/reconcile'
import { ShrinkBoardWarningModal } from '../components/ShrinkBoardWarningModal'
import { CellCoord, coordKey, coordsEqual, indexToCoord, isCoordInGrid } from '../types/coords'
import {
    clearAssetIdFromBoardParameters,
    clearAssetIdFromCellParameters,
    clearAssetIdFromFigureViewParams,
} from '../../projects/assets/assetReferences'
import {
    CollabOp,
    normalizeCollabOps,
    applyCollabOps,
    withBoardId,
    isBoardScopedCollabOp,
    resolveCollabOpBoardId,
} from '../../collab/ops'
import { selectionDebugLog } from '../selectionDebugLog'

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

export function applyRemotePersistDataFromProject(data: ProjectPersistData): {
    boardId: string
    figuresSlice: FiguresSlice
    boardSlice: BoardSlice
    figureCatalog: FigureCatalog
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    catalogHistory: SliceHistory<FigureCatalog>
    state: GameState
} | null {
    const board = data.boards.find(item => item.id === data.activeBoardId) ?? data.boards[0]

    if (!board) {
        return null
    }

    const figureCatalog = cloneFigureCatalog(data.figureCatalog)
    const figuresSlice = createInitialFiguresSliceFromState(board.gameState)
    const boardSlice = createInitialBoardSliceFromState(board.gameState)

    return {
        boardId: board.id,
        figuresSlice,
        boardSlice,
        figureCatalog,
        figuresHistory: board.figuresHistory,
        boardHistory: board.boardHistory,
        catalogHistory: data.catalogHistory,
        state: composeGameState(figuresSlice, boardSlice, figureCatalog),
    }
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
    const [boardSlice, setBoardSlice] = useState<BoardSlice>(() =>
        createInitialBoardSliceFromState(initialState),
    )
    const [figureCatalog, setFigureCatalog] = useState<FigureCatalog>(() =>
        cloneFigureCatalog(initialCatalog),
    )
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
    const [activeFigure, setActiveFigure] = useState<FigureId | undefined>(undefined)

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
    const pendingBoardParametersRef = useRef<BoardParameters | null>(null)

    const clearActiveCellIfInvalid = useCallback((n: number, m: number, cell?: CellCoord) => {
        const active = cell ?? activeCell
        if (active !== undefined && !isCoordInGrid(active, n, m)) {
            selectionDebugLog.cleared('outside grid after board change', active)
            setActiveCell(undefined, 'outside grid after board change')
        }
    }, [activeCell, setActiveCell])

    const syncComposedState = useCallback((
        nextFigures: FiguresSlice,
        nextBoard: BoardSlice,
        catalog: FigureCatalog = figureCatalog,
        cellToValidate?: CellCoord,
    ) => {
        const { n, m } = nextBoard.boardParameters
        const prunedBoard = pruneCellParameters(nextBoard, n, m)
        const prunedFigures = pruneFigures(nextFigures, n, m)
        const nextState = composeGameState(prunedFigures, prunedBoard, catalog)
        setFiguresSlice(prunedFigures)
        setBoardSlice(prunedBoard)
        setState(nextState)
        clearActiveCellIfInvalid(n, m, cellToValidate)
        return { nextState, prunedFigures, prunedBoard }
    }, [figureCatalog, clearActiveCellIfInvalid])

    const skipInitialPersistRef = useRef(true)
    const skipPersistRef = useRef(false)
    const skipCollabOpRef = useRef(false)

    const emitCollabOp = useCallback((op: CollabOp | CollabOp[]) => {
        if (skipCollabOpRef.current || !onCollabOp) {
            return
        }

        const boardId = activeBoardIdRef.current
        const resolved = normalizeCollabOps(op).map(item => withBoardId(item, boardId))
        onCollabOp(resolved.length === 1 ? resolved[0] : resolved)
    }, [onCollabOp])

    const pushFiguresChange = useCallback((
        nextFigures: FiguresSlice,
        op?: CollabOp | CollabOp[],
    ) => {
        const cloned = cloneFiguresSlice(nextFigures)
        const result = historyPush(figuresHistory, figuresSlice, cloned)
        setFiguresHistory(result.history)
        setFiguresSlice(result.current)
        syncComposedState(result.current, boardSlice, figureCatalog)

        if (op) {
            emitCollabOp(op)
        } else {
            emitCollabOp({ kind: 'figures', boardId: activeBoardIdRef.current, figures: result.current })
        }
    }, [figuresHistory, figuresSlice, boardSlice, figureCatalog, syncComposedState, emitCollabOp])

    const applyBoardChange = useCallback((
        nextBoard: BoardSlice,
        pushHistory = true,
        op?: CollabOp | CollabOp[],
    ) => {
        const cloned = cloneBoardSlice(nextBoard)
        const { n, m } = cloned.boardParameters
        const prunedBoard = pruneCellParameters(cloned, n, m)
        const prunedFigures = pruneFigures(figuresSlice, n, m)

        if (pushHistory) {
            const result = historyPush(boardHistory, boardSlice, prunedBoard)
            setBoardHistory(result.history)
            setBoardSlice(result.current)
        } else {
            setBoardSlice(prunedBoard)
        }

        setFiguresSlice(prunedFigures)
        const nextState = composeGameState(prunedFigures, prunedBoard, figureCatalog)
        setState(nextState)
        clearActiveCellIfInvalid(n, m)

        if (op) {
            const resolved = normalizeCollabOps(op).map(item => (
                item.kind === 'board-sync' ? { ...item, board: prunedBoard } : item
            ))
            emitCollabOp(resolved.length === 1 ? resolved[0] : resolved)
        }
    }, [boardHistory, boardSlice, figuresSlice, figureCatalog, clearActiveCellIfInvalid, emitCollabOp])

    const applyCatalogChange = useCallback((
        nextCatalog: FigureCatalog,
        pushHistory = true,
        op?: CollabOp | CollabOp[],
    ) => {
        const cloned = cloneFigureCatalog(nextCatalog)
        let resolvedCatalog = cloned

        if (pushHistory) {
            const result = historyPush(catalogHistory, figureCatalog, cloned)
            setCatalogHistory(result.history)
            setFigureCatalog(result.current)
            resolvedCatalog = result.current
        } else {
            setFigureCatalog(cloned)
        }

        setState(composeGameState(figuresSlice, boardSlice, resolvedCatalog))

        if (op) {
            emitCollabOp(op)
        }
    }, [catalogHistory, figureCatalog, figuresSlice, boardSlice, emitCollabOp])

    const applyRemotePersistData = useCallback((data: ProjectPersistData) => {
        skipPersistRef.current = true

        const resolved = applyRemotePersistDataFromProject(data)

        if (!resolved) {
            return
        }

        setFiguresSlice(resolved.figuresSlice)
        setBoardSlice(resolved.boardSlice)
        setFigureCatalog(resolved.figureCatalog)
        setFiguresHistory(resolved.figuresHistory)
        setBoardHistory(resolved.boardHistory)
        setCatalogHistory(resolved.catalogHistory)
        setState(resolved.state)
    }, [])

    const applyRemoteOps = useCallback((ops: CollabOp[]): GameState => {
        skipPersistRef.current = true
        skipCollabOpRef.current = true

        const visibleBoardId = activeBoardIdRef.current
        const relevantOps = ops.filter(op => {
            if (!isBoardScopedCollabOp(op)) {
                return true
            }

            return resolveCollabOpBoardId(op, visibleBoardId) === visibleBoardId
        })

        if (relevantOps.length === 0) {
            return composeGameState(figuresSlice, boardSlice, figureCatalog)
        }

        const result = applyCollabOps(figuresSlice, boardSlice, figureCatalog, relevantOps)
        setFiguresSlice(result.figures)
        setBoardSlice(result.board)
        setFigureCatalog(result.catalog)
        setState(result.state)
        return result.state
    }, [figuresSlice, boardSlice, figureCatalog])

    useEffect(() => {
        if (skipInitialPersistRef.current) {
            skipInitialPersistRef.current = false
            return
        }

        if (skipPersistRef.current) {
            skipPersistRef.current = false
            skipCollabOpRef.current = false
            return
        }

        onPersist?.({
            activeBoardId: activeBoardIdRef.current,
            state,
            figuresHistory,
            boardHistory,
            figureCatalog,
            catalogHistory,
        })
    }, [state, figuresHistory, boardHistory, figureCatalog, catalogHistory, onPersist])

    const undoFigures = useCallback(() => {
        const result = historyUndo(figuresHistory, figuresSlice)
        setFiguresHistory(result.history)
        syncComposedState(result.current, boardSlice, figureCatalog)
        emitCollabOp({ kind: 'figures', boardId: activeBoardIdRef.current, figures: result.current })
    }, [figuresHistory, figuresSlice, boardSlice, figureCatalog, syncComposedState, emitCollabOp])

    const redoFigures = useCallback(() => {
        const result = historyRedo(figuresHistory, figuresSlice)
        setFiguresHistory(result.history)
        syncComposedState(result.current, boardSlice, figureCatalog)
        emitCollabOp({ kind: 'figures', boardId: activeBoardIdRef.current, figures: result.current })
    }, [figuresHistory, figuresSlice, boardSlice, figureCatalog, syncComposedState, emitCollabOp])

    const undoBoard = useCallback(() => {
        const result = historyUndo(boardHistory, boardSlice)
        setBoardHistory(result.history)
        applyBoardChange(result.current, false, { kind: 'board-sync', boardId: activeBoardIdRef.current, board: result.current })
    }, [boardHistory, boardSlice, applyBoardChange])

    const redoBoard = useCallback(() => {
        const result = historyRedo(boardHistory, boardSlice)
        setBoardHistory(result.history)
        applyBoardChange(result.current, false, { kind: 'board-sync', boardId: activeBoardIdRef.current, board: result.current })
    }, [boardHistory, boardSlice, applyBoardChange])

    const setBoardParameters = useCallback((value: BoardParameters) => {
        const nextBoard: BoardSlice = {
            ...boardSlice,
            boardParameters: value,
        }

        const shrinking = isGridShrink(boardSlice.boardParameters, value)
        const outsideCount = countFiguresOutsideGrid(figuresSlice, value.n, value.m)

        if (shrinking && outsideCount > 0) {
            pendingBoardParametersRef.current = value
            setShrinkWarningCount(outsideCount)
            setShrinkWarningOpen(true)
            return
        }

        applyBoardChange(nextBoard, true, { kind: 'board-parameters', boardId: activeBoardIdRef.current, boardParameters: value })
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
    }, [])

    const setStyleRules = useCallback((value: BoardStyleRule[]) => {
        applyBoardChange({
            ...boardSlice,
            styleRules: value,
        }, true, { kind: 'style-rules', boardId: activeBoardIdRef.current, styleRules: value })
    }, [boardSlice, applyBoardChange])

    const toTray = useCallback((coord: CellCoord) => {
        const key = coordKey(coord)
        const oldFigure = figuresSlice.figuresByCoord[key]
        if (!oldFigure) {
            return
        }

        const figuresByCoord = { ...figuresSlice.figuresByCoord }
        delete figuresByCoord[key]

        pushFiguresChange({
            figuresByCoord,
            tray: [oldFigure, ...figuresSlice.tray],
        })
    }, [figuresSlice, pushFiguresChange])

    const replace = useCallback((coord: CellCoord, figure: FigureId) => {
        const key = coordKey(coord)
        const oldFigure = figuresSlice.figuresByCoord[key]
        if (!oldFigure) {
            return
        }

        pushFiguresChange({
            figuresByCoord: {
                ...figuresSlice.figuresByCoord,
                [key]: figure,
            },
            tray: [oldFigure, ...figuresSlice.tray],
        })
    }, [figuresSlice, pushFiguresChange])

    const setFigure = useCallback((coord: CellCoord, figure: FigureId) => {
        const key = coordKey(coord)
        if (figuresSlice.figuresByCoord[key]) {
            return
        }

        pushFiguresChange({
            figuresByCoord: {
                ...figuresSlice.figuresByCoord,
                [key]: figure,
            },
            tray: figuresSlice.tray,
        })
    }, [figuresSlice, pushFiguresChange])

    const setCellFigure = useCallback((coord: CellCoord, figure: FigureId) => {
        const key = coordKey(coord)
        if (figuresSlice.figuresByCoord[key]) {
            replace(coord, figure)
        } else {
            setFigure(coord, figure)
        }
    }, [figuresSlice, replace, setFigure])

    const moveActiveCellFigureTo = useCallback((to: CellCoord) => {
        if (activeCell === undefined) {
            return
        }

        if (coordsEqual(activeCell, to)) {
            setActiveCell(undefined, 'move to same cell')
            return
        }

        const from = activeCell
        const fromKey = coordKey(from)
        const toKey = coordKey(to)
        const fromFigure = figuresSlice.figuresByCoord[fromKey]
        if (!fromFigure) {
            return
        }

        const figureDefinition = resolveFigureDefinition(fromFigure, figureCatalog)

        if (!isFigureMoveAllowed(from, to, figureDefinition, figuresSlice.figuresByCoord, state.boardParameters)) {
            return
        }

        setActiveCell(undefined, 'figure move start')

        const toFigure = figuresSlice.figuresByCoord[toKey]
        const figuresByCoord = { ...figuresSlice.figuresByCoord }
        let newTray = figuresSlice.tray

        figuresByCoord[toKey] = fromFigure

        if (state.boardParameters.swapOnEat) {
            if (toFigure) {
                figuresByCoord[fromKey] = toFigure
            } else {
                delete figuresByCoord[fromKey]
            }
        } else {
            delete figuresByCoord[fromKey]
            if (toFigure) {
                newTray = [toFigure, ...newTray]
            }
        }

        pushFiguresChange({
            figuresByCoord,
            tray: newTray,
        })
    }, [activeCell, figuresSlice, figureCatalog, state.boardParameters, pushFiguresChange, setActiveCell])

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

    const setTray = useCallback((value: FigureId[]) => {
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
    ) => {
        const entry = figureCatalog.find(item => item.id === figureId)
        const currentState = entry?.states[Math.min(Math.max(0, stateIndex), (entry?.states.length ?? 1) - 1)]

        applyCatalogChange(
            updateFigureCatalogStateAtIndex(figureCatalog, figureId, stateIndex, state => ({
                ...state,
                moveRules,
                jumpOverPieces: jumpOverPieces ?? state.jumpOverPieces === true,
            })),
            true,
            {
                kind: 'figure-move-rules',
                figureId,
                stateIndex,
                moveRules,
                jumpOverPieces: jumpOverPieces ?? currentState?.jumpOverPieces === true,
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

    const addFigure = useCallback(() => {
        const newFigure = createNewFigureDefinition()

        applyCatalogChange(
            [...figureCatalog, newFigure],
            true,
            { kind: 'figure-add', figure: newFigure },
        )

        setMode(Mode.FiguresArrange)
        setActiveFigure(newFigure.id)
    }, [figureCatalog, applyCatalogChange])

    const removeFigure = useCallback((figureId: FigureId) => {
        const nextCatalog = figureCatalog.filter(entry => entry.id !== figureId)
        if (nextCatalog.length === figureCatalog.length) {
            return
        }

        const nextFigures = cloneFiguresSlice(removeFigureFromBoard(figuresSlice, figureId))

        const catalogResult = historyPush(catalogHistory, figureCatalog, cloneFigureCatalog(nextCatalog))
        const figuresResult = historyPush(figuresHistory, figuresSlice, nextFigures)

        setCatalogHistory(catalogResult.history)
        setFigureCatalog(catalogResult.current)
        setFiguresHistory(figuresResult.history)
        setFiguresSlice(figuresResult.current)
        setState(composeGameState(figuresResult.current, boardSlice, catalogResult.current))
        emitCollabOp({ kind: 'figure-remove', figureId })

        if (activeFigure === figureId) {
            setActiveFigure(undefined)
            setMode(Mode.Game)
        }
    }, [figureCatalog, catalogHistory, boardSlice, figuresSlice, figuresHistory, activeFigure, emitCollabOp])

    const setCells = useCallback((value: GameState['cells']) => {
        const { n } = state.boardParameters
        const figuresByCoord: Record<string, FigureId> = {}
        value.forEach((cell, index) => {
            if (cell.figure) {
                figuresByCoord[coordKey(indexToCoord(index, n))] = cell.figure
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

    const value = useMemo(
        () => ({
            mode,
            setMode,
            state,
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
            activeCell,
            setActiveCell,
            moveActiveCellFigureTo,
            setCellFigure,
            setCellParameters,
            toTray,
            setBoardParameters,
            setStyleRules,
            setTray,
            setCells,
            setFigureStateViewParams,
            setFigureStateMoveRules,
            addFigureState,
            removeFigureState,
            addFigure,
            removeFigure,
            clearAssetReferences,
            applyRemotePersistData,
            applyRemoteOps,
        }),
        [
            mode,
            state,
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
            activeCell,
            moveActiveCellFigureTo,
            setCellFigure,
            setCellParameters,
            toTray,
            setBoardParameters,
            setStyleRules,
            setTray,
            setCells,
            setFigureStateViewParams,
            setFigureStateMoveRules,
            addFigureState,
            removeFigureState,
            addFigure,
            removeFigure,
            clearAssetReferences,
            applyRemotePersistData,
            applyRemoteOps,
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
