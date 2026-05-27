import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultGameContextValue } from '../utils'
import { historyInit, historyPush, historyRedo, historyUndo } from './history'
import { GameContextValue } from './types'
import { FigureTypes } from '../types/figures'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { BoardConnectionsConditionItem, ConnectionParams } from '../types/connections'
import { BoardConditionItem } from '../types/conditions'
import { cellParametersBrushStateInitialValue, connectionParamsBrushStateInitialValue } from './constants'
import {
    BoardSlice,
    FiguresSlice,
    composeGameState,
    createInitialBoardSliceFromState,
    createInitialFiguresSliceFromState,
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
import { clearAssetIdFromCellParameters } from '../../projects/assets/assetReferences'

export const GameContext = React.createContext<GameContextValue>(defaultGameContextValue)

export interface GameProviderProps {
    children: React.ReactNode
    initialState: GameState
    initialFiguresHistory: SliceHistory<FiguresSlice>
    initialBoardHistory: SliceHistory<BoardSlice>
    onPersist?: (data: {
        state: GameState
        figuresHistory: SliceHistory<FiguresSlice>
        boardHistory: SliceHistory<BoardSlice>
    }) => void
}

export function GameProvider({
    children,
    initialState,
    initialFiguresHistory,
    initialBoardHistory,
    onPersist,
}: GameProviderProps) {
    const [figuresSlice, setFiguresSlice] = useState<FiguresSlice>(() =>
        createInitialFiguresSliceFromState(initialState),
    )
    const [boardSlice, setBoardSlice] = useState<BoardSlice>(() =>
        createInitialBoardSliceFromState(initialState),
    )
    const [figuresHistory, setFiguresHistory] = useState(initialFiguresHistory)
    const [boardHistory, setBoardHistory] = useState(initialBoardHistory)

    const [state, setState] = useState<GameState>(initialState)

    const [mode, setMode] = useState<Mode>(Mode.Game)
    const [activeCell, setActiveCell] = useState<CellCoord | undefined>(undefined)
    const [activeFigure, setActiveFigure] = useState<FigureTypes | undefined>(undefined)

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
            setActiveCell(undefined)
        }
    }, [activeCell])

    const syncComposedState = useCallback((
        nextFigures: FiguresSlice,
        nextBoard: BoardSlice,
        cellToValidate?: CellCoord,
    ) => {
        const { n, m } = nextBoard.boardParameters
        const prunedBoard = pruneCellParameters(nextBoard, n, m)
        const prunedFigures = pruneFigures(nextFigures, n, m)
        const nextState = composeGameState(prunedFigures, prunedBoard)
        setFiguresSlice(prunedFigures)
        setBoardSlice(prunedBoard)
        setState(nextState)
        clearActiveCellIfInvalid(n, m, cellToValidate)
        return { nextState, prunedFigures, prunedBoard }
    }, [clearActiveCellIfInvalid])

    const pushFiguresChange = useCallback((nextFigures: FiguresSlice) => {
        const cloned = cloneFiguresSlice(nextFigures)
        const result = historyPush(figuresHistory, figuresSlice, cloned)
        setFiguresHistory(result.history)
        setFiguresSlice(result.current)
        syncComposedState(result.current, boardSlice)
    }, [figuresHistory, figuresSlice, boardSlice, syncComposedState])

    const applyBoardChange = useCallback((nextBoard: BoardSlice, pushHistory = true) => {
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
        const nextState = composeGameState(prunedFigures, prunedBoard)
        setState(nextState)
        clearActiveCellIfInvalid(n, m)
    }, [boardHistory, boardSlice, figuresSlice, clearActiveCellIfInvalid])

    const skipInitialPersistRef = useRef(true)
    useEffect(() => {
        if (skipInitialPersistRef.current) {
            skipInitialPersistRef.current = false
            return
        }
        onPersist?.({ state, figuresHistory, boardHistory })
    }, [state, figuresHistory, boardHistory, onPersist])

    const undoFigures = useCallback(() => {
        const result = historyUndo(figuresHistory, figuresSlice)
        setFiguresHistory(result.history)
        syncComposedState(result.current, boardSlice)
    }, [figuresHistory, figuresSlice, boardSlice, syncComposedState])

    const redoFigures = useCallback(() => {
        const result = historyRedo(figuresHistory, figuresSlice)
        setFiguresHistory(result.history)
        syncComposedState(result.current, boardSlice)
    }, [figuresHistory, figuresSlice, boardSlice, syncComposedState])

    const undoBoard = useCallback(() => {
        const result = historyUndo(boardHistory, boardSlice)
        setBoardHistory(result.history)
        applyBoardChange(result.current, false)
    }, [boardHistory, boardSlice, applyBoardChange])

    const redoBoard = useCallback(() => {
        const result = historyRedo(boardHistory, boardSlice)
        setBoardHistory(result.history)
        applyBoardChange(result.current, false)
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

        applyBoardChange(nextBoard)
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
        })
    }, [boardSlice, applyBoardChange])

    const cancelShrinkBoard = useCallback(() => {
        pendingBoardParametersRef.current = null
        setShrinkWarningOpen(false)
        setShrinkWarningCount(0)
    }, [])

    const setBoardConditions = useCallback((value: BoardConditionItem[]) => {
        applyBoardChange({
            ...boardSlice,
            boardConditions: value,
        })
    }, [boardSlice, applyBoardChange])

    const setBoardConnectionsConditions = useCallback((value: BoardConnectionsConditionItem[]) => {
        applyBoardChange({
            ...boardSlice,
            connectionsConditions: value,
        })
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

    const replace = useCallback((coord: CellCoord, figure: FigureTypes) => {
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

    const setFigure = useCallback((coord: CellCoord, figure: FigureTypes) => {
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

    const setCellFigure = useCallback((coord: CellCoord, figure: FigureTypes) => {
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
            setActiveCell(undefined)
            return
        }

        const from = activeCell
        setActiveCell(undefined)

        const fromKey = coordKey(from)
        const toKey = coordKey(to)
        const fromFigure = figuresSlice.figuresByCoord[fromKey]
        if (!fromFigure) {
            return
        }

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
    }, [activeCell, figuresSlice, state.boardParameters.swapOnEat, pushFiguresChange])

    const setCellParameters = useCallback((coord: CellCoord) => {
        const key = coordKey(coord)
        applyBoardChange({
            ...boardSlice,
            cellParametersByCoord: {
                ...boardSlice.cellParametersByCoord,
                [key]: cellParametersBrushState,
            },
        })
    }, [boardSlice, cellParametersBrushState, applyBoardChange])

    const setTray = useCallback((value: FigureTypes[]) => {
        pushFiguresChange({
            ...figuresSlice,
            tray: value,
        })
    }, [figuresSlice, pushFiguresChange])

    const setCells = useCallback((value: GameState['cells']) => {
        const { n } = state.boardParameters
        const figuresByCoord: Record<string, FigureTypes> = {}
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

        const nextBoardConditions = boardSlice.boardConditions.map(condition => {
            const nextCellParams = clearAssetIdFromCellParameters(condition.cellParams, assetId)
            if (nextCellParams === condition.cellParams) {
                return condition
            }
            cellParamsChanged = true
            return {
                ...condition,
                cellParams: nextCellParams ?? condition.cellParams,
            }
        })

        const nextBrushState = clearAssetIdFromCellParameters(cellParametersBrushState, assetId)
        if (nextBrushState !== cellParametersBrushState) {
            setCellParametersBrushState(nextBrushState ?? cellParametersBrushState)
        }

        if (!cellParamsChanged) {
            return
        }

        applyBoardChange({
            ...boardSlice,
            cellParametersByCoord: nextCellParametersByCoord,
            boardConditions: nextBoardConditions,
        })
    }, [boardSlice, cellParametersBrushState, applyBoardChange])

    const value = useMemo(
        () => ({
            mode,
            setMode,
            state,
            figuresHistory,
            boardHistory,
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
            setBoardConnectionsConditions,
            setBoardConditions,
            setTray,
            setCells,
            clearAssetReferences,
        }),
        [
            mode,
            state,
            figuresHistory,
            boardHistory,
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
            setBoardConnectionsConditions,
            setBoardConditions,
            setTray,
            setCells,
            clearAssetReferences,
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
