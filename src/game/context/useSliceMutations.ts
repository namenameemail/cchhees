import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { historyPush, historyRedo, historyUndo, historyInit } from './history'
import { CollabOp, normalizeCollabOps } from '../../collab/ops'
import { CellCoord, isCoordInGrid } from '../types/coords'
import { FigureCatalog } from '../types/figures'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import {
    BoardSlice,
    FiguresSlice,
    composeGameState,
    cloneFigureCatalog,
} from '../state/slices'
import {
    cloneBoardSlice,
    cloneFiguresSlice,
    pruneCellParameters,
    pruneFigures,
} from '../state/reconcile'

export function useSliceMutations(options: {
    activeBoardIdRef: MutableRefObject<string>
    figuresSlice: FiguresSlice
    boardSlice: BoardSlice
    figureCatalog: FigureCatalog
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    catalogHistory: SliceHistory<FigureCatalog>
    setFiguresSlice: (value: FiguresSlice) => void
    setBoardSlice: (value: BoardSlice) => void
    setFigureCatalog: (value: FigureCatalog) => void
    setFiguresHistory: (value: SliceHistory<FiguresSlice>) => void
    setBoardHistory: (value: SliceHistory<BoardSlice>) => void
    setCatalogHistory: (value: SliceHistory<FigureCatalog>) => void
    setState: (value: GameState) => void
    clearActiveCellIfInvalid: (n: number, m: number, cell?: CellCoord) => void
    emitCollabOp: (op: CollabOp | CollabOp[]) => void
}) {
    const {
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
    } = options

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
    }, [figureCatalog, clearActiveCellIfInvalid, setFiguresSlice, setBoardSlice, setState])

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
    }, [
        figuresHistory,
        figuresSlice,
        boardSlice,
        figureCatalog,
        syncComposedState,
        emitCollabOp,
        activeBoardIdRef,
        setFiguresHistory,
        setFiguresSlice,
    ])

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
    }, [
        boardHistory,
        boardSlice,
        figuresSlice,
        figureCatalog,
        clearActiveCellIfInvalid,
        emitCollabOp,
        setBoardHistory,
        setBoardSlice,
        setFiguresSlice,
        setState,
    ])

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
    }, [
        catalogHistory,
        figureCatalog,
        figuresSlice,
        boardSlice,
        emitCollabOp,
        setCatalogHistory,
        setFigureCatalog,
        setState,
    ])

    const undoFigures = useCallback(() => {
        const result = historyUndo(figuresHistory, figuresSlice)
        setFiguresHistory(result.history)
        syncComposedState(result.current, boardSlice, figureCatalog)
        emitCollabOp({ kind: 'figures', boardId: activeBoardIdRef.current, figures: result.current })
    }, [figuresHistory, figuresSlice, boardSlice, figureCatalog, syncComposedState, emitCollabOp, activeBoardIdRef, setFiguresHistory])

    const redoFigures = useCallback(() => {
        const result = historyRedo(figuresHistory, figuresSlice)
        setFiguresHistory(result.history)
        syncComposedState(result.current, boardSlice, figureCatalog)
        emitCollabOp({ kind: 'figures', boardId: activeBoardIdRef.current, figures: result.current })
    }, [figuresHistory, figuresSlice, boardSlice, figureCatalog, syncComposedState, emitCollabOp, activeBoardIdRef, setFiguresHistory])

    const undoBoard = useCallback(() => {
        const result = historyUndo(boardHistory, boardSlice)
        setBoardHistory(result.history)
        applyBoardChange(result.current, false, { kind: 'board-sync', boardId: activeBoardIdRef.current, board: result.current })
    }, [boardHistory, boardSlice, applyBoardChange, activeBoardIdRef, setBoardHistory])

    const redoBoard = useCallback(() => {
        const result = historyRedo(boardHistory, boardSlice)
        setBoardHistory(result.history)
        applyBoardChange(result.current, false, { kind: 'board-sync', boardId: activeBoardIdRef.current, board: result.current })
    }, [boardHistory, boardSlice, applyBoardChange, activeBoardIdRef, setBoardHistory])

    const restoreFiguresToDefault = useCallback((nextFigures: FiguresSlice) => {
        const cloned = cloneFiguresSlice(nextFigures)
        setFiguresHistory(historyInit())
        syncComposedState(cloned, boardSlice, figureCatalog)
        emitCollabOp({ kind: 'figures', boardId: activeBoardIdRef.current, figures: cloned })
    }, [
        boardSlice,
        figureCatalog,
        syncComposedState,
        emitCollabOp,
        activeBoardIdRef,
        setFiguresHistory,
    ])

    return {
        syncComposedState,
        pushFiguresChange,
        applyBoardChange,
        applyCatalogChange,
        undoFigures,
        redoFigures,
        undoBoard,
        redoBoard,
        restoreFiguresToDefault,
    }
}
