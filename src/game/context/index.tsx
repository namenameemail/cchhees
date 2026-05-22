import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCells, defaultGameContextValue } from '../utils'
import { historyPush, historyRedo, historyUndo } from './history'
import { GameContextValue } from './types'
import { FigureTypes } from '../types/figures'
import { CellParameters } from '../types/cells'
import { GameState } from '../types/gameState'
import { GameStateHistory } from '../types/history'
import { Mode } from '../types'
import { BoardParameters } from '../types/boardParameters'
import { BoardConnectionsConditionItem, ConnectionParams } from '../types/connections'
import { BoardConditionItem } from '../types/conditions'
import { cellParametersBrushStateInitialValue, connectionParamsBrushStateInitialValue } from './constants'


export const GameContext = React.createContext<GameContextValue>(defaultGameContextValue)

export interface GameProviderProps {
    children: React.ReactNode
    initialState: GameState
    initialHistory: GameStateHistory
    onPersist?: (data: { state: GameState; stateHistory: GameStateHistory }) => void
}

export function GameProvider({
    children,
    initialState,
    initialHistory,
    onPersist,
}: GameProviderProps) {

    const [state, setState] = useState<GameState>(initialState)
    const [stateHistory, setStateHistory] = useState<GameStateHistory>(initialHistory)

    const [mode, setMode] = useState<Mode>(Mode.Game)

    const [activeCell, setActiveCell] = useState<number | undefined>(undefined)

    const [activeFigure, setActiveFigure] = useState<FigureTypes | undefined>(undefined)

    const [cellParametersBrushState, setCellParametersBrushState] = useState<CellParameters>(cellParametersBrushStateInitialValue)
    const [connectionParamsBrushState, setConnectionParamsBrushState] = useState<ConnectionParams>(connectionParamsBrushStateInitialValue)

    useEffect(() => {
        // console.log('stateHistory', stateHistory)
    }, [stateHistory])

    const setGameStateWithHistory = useCallback((newState: GameState) => {
        const result = historyPush(stateHistory, state, newState)

        setStateHistory(result.history)
        setState(result.current)
    }, [stateHistory, state])

    const undo = useCallback(() => {
        const result = historyUndo(stateHistory, state)

        setStateHistory(result.history)
        setState(result.current)
    }, [stateHistory, state])

    const redo = useCallback(() => {
        const result = historyRedo(stateHistory, state)

        setStateHistory(result.history)
        setState(result.current)
    }, [stateHistory, state])

    const setStateField = useCallback(
        (field: string, value: any) => setGameStateWithHistory({
            ...state,
            [field]: value,
        }), [state, setGameStateWithHistory],
    )

    const toggleBoolean = useCallback((field: string) => {
        setStateField(field, !state[field])
    }, [setStateField, state])


    useEffect(() => {
        setState(state =>  ({
            ...state,
            cells: getCells(state.boardParameters.n, state.boardParameters.m, state.cells),
        }))
    }, [state.boardParameters.n, state.boardParameters.m])

    const skipInitialPersistRef = useRef(true)
    useEffect(() => {
        if (skipInitialPersistRef.current) {
            skipInitialPersistRef.current = false
            return
        }
        onPersist?.({ state, stateHistory })
    }, [state, stateHistory, onPersist])

    const setCells = useCallback((value) => setStateField('cells', value), [setStateField])
    const setTray = useCallback((value) => setStateField('tray', value), [setStateField])
    const setBoardParameters = useCallback((value: BoardParameters) => setStateField('boardParameters', value), [setStateField])
    const setBoardConditions = useCallback((value: BoardConditionItem[]) => {

        setGameStateWithHistory({
            ...state,
            boardConditions: value,
        })
    }, [state, setGameStateWithHistory])
    const setBoardConnectionsConditions = useCallback((value: BoardConnectionsConditionItem[]) => {

        setGameStateWithHistory({
            ...state,
            connectionsConditions: value,
        })
    }, [state, setGameStateWithHistory])


    const toTray = useCallback((index: number) => {
        const oldFigure = state.cells[index].figure
        if (oldFigure) {
            const newCells = [...state.cells]
            newCells[index] = {
                ...newCells[index],
                figure: undefined,
            }

            setGameStateWithHistory({
                ...state,
                cells: newCells,
                tray: [oldFigure, ...state.tray],
            })
        }
    }, [state, setGameStateWithHistory])

    const replace = useCallback((index: number, figure: FigureTypes) => {
        const oldFigure = state.cells[index].figure
        if (oldFigure) {
            const newCells = [...state.cells]
            newCells[index] = {
                ...newCells[index],
                figure,
            }

            setGameStateWithHistory({
                ...state,
                cells: newCells,
                tray: [oldFigure, ...state.tray],
            })
        }
    }, [state, setGameStateWithHistory])

    const setFigure = useCallback((index: number, figure: FigureTypes) => {
        const oldFigure = state.cells[index].figure
        if (!oldFigure) {
            const newCells = [...state.cells]
            newCells[index] = {
                ...newCells[index],
                figure,
            }

            setGameStateWithHistory({
                ...state,
                cells: newCells,
            })
        }
    }, [state, setGameStateWithHistory])

    const setCellFigure = useCallback((index: number, figure: FigureTypes) => {
        const oldFigure = state.cells[index].figure
        if (oldFigure) {
            replace(index, figure)
        } else {
            setFigure(index, figure)
        }
    }, [state, setFigure, replace])

    const moveActiveCellFigureTo = useCallback((to: number) => {

        if (activeCell === undefined) {
            return
        }

        if (activeCell === to) {
            setActiveCell(undefined)
            return
        }

        setActiveCell(undefined)

        const from = activeCell

        const fromFigure = state.cells[activeCell].figure

        if (!fromFigure) {
            return
        }

        const toFigure = state.cells[to].figure

        const newCells = [...state.cells]
        let newTray = state.tray

        if (fromFigure) {
            newCells[to] = {
                ...newCells[to],
                figure: fromFigure,
            }

            if (state.boardParameters.swapOnEat) {
                newCells[from] = {
                    ...newCells[from],
                    figure: toFigure,
                }
            } else {
                newCells[from] = {
                    ...newCells[from],
                    figure: undefined,
                }
                if (toFigure) {
                    newTray = [toFigure, ...newTray]
                }
            }
        }
        setGameStateWithHistory({
            ...state,
            cells: newCells,
            tray: newTray,
        })
    }, [state, activeCell, setGameStateWithHistory])


    const setCellParameters = useCallback((index: number) => {
        const newCells = [...state.cells]
        newCells[index] = {
            ...newCells[index],
            parameters: cellParametersBrushState,
        }
        setGameStateWithHistory({
            ...state,
            cells: newCells,
        })
    }, [state, setGameStateWithHistory, cellParametersBrushState])

    const value = useMemo(
        () => ({
            mode,
            setMode,
            undo,
            redo,
            stateHistory,

            cellParametersBrushState, setCellParametersBrushState,
            connectionParamsBrushState, setConnectionParamsBrushState,

            activeFigure,
            setActiveFigure,

            activeCell,
            setActiveCell,
            moveActiveCellFigureTo,
            setCellFigure,
            setCellParameters,
            toTray,

            state,



            setBoardParameters,
            setBoardConnectionsConditions,
            setBoardConditions,
            setGameStateWithHistory,

            setTray,
            setCells,

        }),
        [
            mode, setMode,
            state,
            cellParametersBrushState, setCellParametersBrushState,
            connectionParamsBrushState, setConnectionParamsBrushState,
            undo, redo, stateHistory,

            setBoardParameters,
            setBoardConnectionsConditions,
            setBoardConditions,
            setGameStateWithHistory,

            setTray, setCells,
            activeFigure, setActiveFigure,
            activeCell, setActiveCell, moveActiveCellFigureTo, setCellFigure, setCellParameters, toTray,
        ],
    )

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    )
}

export const useGameContext = () => React.useContext(GameContext)
