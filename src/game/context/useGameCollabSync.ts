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
import { FigureCatalog, FigureTeams } from '../types/figures'
import { BoardSlice, FiguresSlice, composeGameState } from '../state/slices'
import { normalizeFigureTeams } from '../figureTeams'
import { applyRemotePersistDataFromProject } from './remotePersist'

export function useGameCollabSync(options: {
    activeBoardIdRef: MutableRefObject<string>
    onPersist?: (data: ActiveBoardPersistPayload) => void
    onCollabOp?: (op: CollabOp | CollabOp[]) => void
    state: GameState
    figuresHistory: SliceHistory<FiguresSlice>
    boardHistory: SliceHistory<BoardSlice>
    figureCatalog: FigureCatalog
    figureTeams: FigureTeams
    catalogHistory: SliceHistory<FigureCatalog>
    figuresSlice: FiguresSlice
    boardSlice: BoardSlice
    setFiguresSlice: (value: FiguresSlice) => void
    setBoardSlice: (value: BoardSlice) => void
    setFigureCatalog: (value: FigureCatalog) => void
    setFigureTeams: (value: FigureTeams) => void
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
        figureTeams,
        catalogHistory,
        figuresSlice,
        boardSlice,
        setFiguresSlice,
        setBoardSlice,
        setFigureCatalog,
        setFigureTeams,
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
        setFigureTeams(resolved.figureTeams)
        setFiguresHistory(resolved.figuresHistory)
        setBoardHistory(resolved.boardHistory)
        setCatalogHistory(resolved.catalogHistory)
        setState(resolved.state)
    }, [
        setFiguresSlice,
        setBoardSlice,
        setFigureCatalog,
        setFigureTeams,
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

        const teamOps = relevantOps.filter(op => op.kind === 'figure-teams')
        const catalogOps = relevantOps.filter(op => op.kind !== 'figure-teams')

        if (teamOps.length > 0) {
            setFigureTeams(normalizeFigureTeams(teamOps[teamOps.length - 1]!.teams))
        }

        if (catalogOps.length === 0) {
            return composeGameState(figuresSlice, boardSlice, figureCatalog)
        }

        const result = applyCollabOps(figuresSlice, boardSlice, figureCatalog, catalogOps)
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
        setFiguresSlice,
        setBoardSlice,
        setFigureCatalog,
        setFigureTeams,
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
            figureTeams,
            catalogHistory,
        })
    }, [
        activeBoardIdRef,
        onPersist,
        state,
        figuresHistory,
        boardHistory,
        figureCatalog,
        figureTeams,
        catalogHistory,
    ])

    return {
        emitCollabOp,
        applyRemotePersistData,
        applyRemoteOps,
        notifyPersistIfNeeded,
    }
}
