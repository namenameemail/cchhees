import { useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import {
    CollabOp,
    applyCollabOps,
    isBoardScopedCollabOp,
    normalizeCollabOps,
    resolveCollabOpBoardId,
    withBoardId,
} from '../../collab/ops'
import { ActiveBoardPersistPayload } from '../../projects/projectPersist'
import { ProjectPersistData } from '../../projects/types'
import { GameState } from '../types/gameState'
import { SliceHistory } from '../types/history'
import { FigureCatalog } from '../types/figures'
import { BoardSlice, FiguresSlice, composeGameState } from '../state/slices'
import { applyRemotePersistDataFromProject } from './remotePersist'

export function useGameCollabSync(options: {
    activeBoardIdRef: MutableRefObject<string>
    onPersist?: (data: ActiveBoardPersistPayload) => void
    onCollabOp?: (op: CollabOp | CollabOp[]) => void
    state: GameState
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    figureCatalog: FigureCatalog
    catalogHistory: SliceHistory<FigureCatalog>
    figuresSlice: FiguresSlice
    boardSlice: BoardSlice
    setFiguresSlice: (value: FiguresSlice) => void
    setBoardSlice: (value: BoardSlice) => void
    setFigureCatalog: (value: FigureCatalog) => void
    setFiguresHistory: (value: SliceHistory<FiguresSlice>) => void
    setBoardHistory: (value: SliceHistory<BoardSlice>) => void
    setCatalogHistory: (value: SliceHistory<FigureCatalog>) => void
    setState: (value: GameState) => void
    skipFigureAnimationRef: MutableRefObject<boolean>
}) {
    const {
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
    } = options

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
    }, [activeBoardIdRef, onCollabOp])

    const applyRemotePersistData = useCallback((data: ProjectPersistData) => {
        skipPersistRef.current = true
        skipFigureAnimationRef.current = true

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
    }, [
        setFiguresSlice,
        setBoardSlice,
        setFigureCatalog,
        setFiguresHistory,
        setBoardHistory,
        setCatalogHistory,
        setState,
        skipFigureAnimationRef,
    ])

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
    }, [
        activeBoardIdRef,
        figuresSlice,
        boardSlice,
        figureCatalog,
        catalogHistory,
        state,
        setFiguresSlice,
        setBoardSlice,
        setFigureCatalog,
        setState,
    ])

    const notifyPersistIfNeeded = useCallback(() => {
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
    }, [
        activeBoardIdRef,
        onPersist,
        state,
        figuresHistory,
        boardHistory,
        figureCatalog,
        catalogHistory,
    ])

    return {
        emitCollabOp,
        applyRemotePersistData,
        applyRemoteOps,
        notifyPersistIfNeeded,
    }
}
