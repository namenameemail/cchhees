import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {
    deleteAssetsByProjectId,
    deleteProject as deleteProjectFromDb,
    getAllProjects,
    getAllVisitedRooms,
    getCurrentProjectId,
    getCurrentProjectKind,
    putProject,
    putVisitedRoom,
    setCurrentProjectSession,
} from './db'
import { createEmptyProject, getDefaultProjectName } from './createProject'
import { exportProjectToFile, importProjectFromFile } from './projectFile'
import {
    Project,
    ProjectPersistData,
    migrateProject,
    getActiveBoard,
    getActiveBoardGameState,
    projectToPersistData,
    BoardDocument,
} from './types'
import { createEmptyBoardDocument, resolveBoardName } from './boardDocument'
import {
    ActiveBoardPersistPayload,
    getProjectPersistData,
    mergeActiveBoardPersist,
    mergeActiveBoardPersistIntoVisitedRoom,
    updateActiveBoardPreview,
    updateVisitedRoomPreview,
    visitedRoomAsProject,
} from './projectPersist'
import { GameState } from '../game/types/gameState'
import { migrateInlineAssets } from './assets/migrateInlineAssets'
import { profileDebug } from '../profiler'
import { projectsBootstrapLog } from './projectsBootstrapLog'
import { CollabSnapshot } from '../collab/types'
import { assetsDebugLog } from './assets/assetsDebugLog'
import { importCollabSnapshotAsVisitedRoom } from './visitedRooms/importVisitedRoom'
import { promoteVisitedRoomToLocalProject } from './visitedRooms/promoteToLocal'
import {
    ProjectSessionKind,
    VisitedRoom,
    visitedRoomToProject,
} from './visitedRooms/types'

const AUTOSAVE_DELAY_MS = 400

export type ProjectPreviewCapture = () => Promise<string | null>

export interface ProjectContextValue {
    isReady: boolean
    projects: Project[]
    visitedRooms: VisitedRoom[]
    currentProject: Project | null
    currentProjectId: string | null
    currentProjectKind: ProjectSessionKind
    activeBoardId: string | null
    boards: BoardDocument[]
    gameSessionEpoch: number
    persistProjectData: (data: ActiveBoardPersistPayload) => void
    registerPreviewCapture: (capture: ProjectPreviewCapture | null) => void
    createProject: (name?: string) => Promise<void>
    renameProject: (id: string, name: string) => Promise<void>
    deleteProject: (id: string) => Promise<void>
    switchProject: (id: string) => Promise<void>
    switchVisitedRoom: (hostProjectId: string) => Promise<void>
    switchProjectSession: (projectId: string, kind: ProjectSessionKind) => Promise<void>
    switchBoard: (boardId: string) => Promise<void>
    createBoard: (name?: string) => Promise<void>
    renameBoard: (boardId: string, name: string) => Promise<void>
    deleteBoard: (boardId: string) => Promise<void>
    duplicateBoard: (boardId: string) => Promise<void>
    promoteVisitedRoomToLocal: (hostProjectId: string) => Promise<void>
    replaceProjectGameState: (id: string, gameState: GameState) => Promise<void>
    exportProject: (id: string) => Promise<void>
    importProjectsFromFiles: (files: File[]) => Promise<Project | null>
    importCollaborativeProject: (snapshot: CollabSnapshot, roomId: string) => Promise<Project>
    getCurrentHostAssetIdRemap: () => Record<number, number> | undefined
    appendHostAssetIdRemap: (hostId: number, localId: number) => Promise<void>
    getPersistDataForSession: (projectId: string, kind: ProjectSessionKind) => ProjectPersistData | null
    persistProjectDataForSession: (
        projectId: string,
        kind: ProjectSessionKind,
        data: ProjectPersistData,
    ) => Promise<void>
    getHostAssetIdRemapFor: (localProjectId: string) => Record<number, number> | undefined
    appendHostAssetIdRemapFor: (localProjectId: string, hostId: number, localId: number) => Promise<void>
}

const defaultContextValue: ProjectContextValue = {
    isReady: false,
    projects: [],
    visitedRooms: [],
    currentProject: null,
    currentProjectId: null,
    currentProjectKind: 'local',
    activeBoardId: null,
    boards: [],
    gameSessionEpoch: 0,
    persistProjectData: () => {},
    registerPreviewCapture: () => {},
    createProject: async () => {},
    renameProject: async () => {},
    deleteProject: async () => {},
    switchProject: async () => {},
    switchVisitedRoom: async () => {},
    switchProjectSession: async () => {},
    switchBoard: async () => {},
    createBoard: async () => {},
    renameBoard: async () => {},
    deleteBoard: async () => {},
    duplicateBoard: async () => {},
    promoteVisitedRoomToLocal: async () => {},
    replaceProjectGameState: async () => {},
    exportProject: async () => {},
    importProjectsFromFiles: async () => null,
    importCollaborativeProject: async () => {
        throw new Error('Project context is not ready')
    },
    getCurrentHostAssetIdRemap: () => undefined,
    appendHostAssetIdRemap: async () => {},
    getPersistDataForSession: () => null,
    persistProjectDataForSession: async () => {},
    getHostAssetIdRemapFor: () => undefined,
    appendHostAssetIdRemapFor: async () => {},
}

export const ProjectContext = createContext<ProjectContextValue>(defaultContextValue)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [visitedRooms, setVisitedRooms] = useState<VisitedRoom[]>([])
    const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null)
    const [currentProjectKind, setCurrentProjectKindState] = useState<ProjectSessionKind>('local')
    const [gameSessionEpoch, setGameSessionEpoch] = useState(0)

    const projectsRef = useRef(projects)
    const visitedRoomsRef = useRef(visitedRooms)
    const currentProjectIdRef = useRef(currentProjectId)
    const currentProjectKindRef = useRef(currentProjectKind)
    const pendingPersistRef = useRef<ActiveBoardPersistPayload | null>(null)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const skipNextPersistRef = useRef(false)
    const previewCaptureRef = useRef<ProjectPreviewCapture | null>(null)
    const previewGenerationRef = useRef(0)

    projectsRef.current = projects
    visitedRoomsRef.current = visitedRooms
    currentProjectIdRef.current = currentProjectId
    currentProjectKindRef.current = currentProjectKind

    const currentProject = useMemo(() => {
        if (!currentProjectId) {
            return null
        }

        if (currentProjectKind === 'visited') {
            const room = visitedRooms.find(item => item.localProjectId === currentProjectId)
            return room ? visitedRoomToProject(room) : null
        }

        return projects.find(item => item.id === currentProjectId) ?? null
    }, [currentProjectId, currentProjectKind, projects, visitedRooms])

    const activeBoardId = currentProject?.activeBoardId ?? null
    const boards = currentProject?.boards ?? []

    const registerPreviewCapture = useCallback((capture: ProjectPreviewCapture | null) => {
        previewCaptureRef.current = capture
    }, [])

    const applyCurrentSession = useCallback(async (id: string, kind: ProjectSessionKind) => {
        await setCurrentProjectSession(id, kind)
        setCurrentProjectIdState(id)
        setCurrentProjectKindState(kind)
    }, [])

    const bumpGameSession = useCallback(() => {
        setGameSessionEpoch(epoch => epoch + 1)
    }, [])

    const refreshProjectPreview = useCallback(async (projectId: string, saved: Project | VisitedRoom) => {
        const capture = previewCaptureRef.current

        if (!capture || currentProjectIdRef.current !== projectId) {
            return
        }

        const generation = previewGenerationRef.current + 1
        previewGenerationRef.current = generation

        try {
            const previewDataUrl = await capture()

            if (
                !previewDataUrl
                || generation !== previewGenerationRef.current
                || currentProjectIdRef.current !== projectId
            ) {
                return
            }

            if (currentProjectKindRef.current === 'visited') {
                const room = visitedRoomsRef.current.find(item => item.localProjectId === projectId)

                if (!room) {
                    return
                }

                const withPreview = updateVisitedRoomPreview(room, previewDataUrl)

                await putVisitedRoom(withPreview, { protectHostProjectId: withPreview.hostProjectId })
                setVisitedRooms(prev => prev.map(item => item.localProjectId === projectId ? withPreview : item))
                return
            }

            const project = projectsRef.current.find(item => item.id === projectId)

            if (!project) {
                return
            }

            const withPreview = updateActiveBoardPreview(project, previewDataUrl)

            await putProject(withPreview)
            setProjects(prev => prev.map(item => item.id === projectId ? withPreview : item))
        } catch (error) {
            console.warn('[ProjectProvider] preview capture failed:', error)
        }
    }, [])

    const flushPendingSave = useCallback(async () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }

        const projectId = currentProjectIdRef.current
        const pending = pendingPersistRef.current

        if (!projectId || !pending) {
            return
        }

        if (currentProjectKindRef.current === 'visited') {
            const room = visitedRoomsRef.current.find(item => item.localProjectId === projectId)

            if (!room) {
                return
            }

            const updated = mergeActiveBoardPersistIntoVisitedRoom(room, pending)

            await putVisitedRoom(updated, { protectHostProjectId: updated.hostProjectId })
            pendingPersistRef.current = null
            assetsDebugLog.persistProject(updated.localProjectId, 'visited room saved')

            setVisitedRooms(prev => prev.map(item => item.localProjectId === projectId ? updated : item))
            void refreshProjectPreview(projectId, updated)
            return
        }

        const project = projectsRef.current.find(item => item.id === projectId)

        if (!project) {
            return
        }

        const updated = mergeActiveBoardPersist(project, pending)

        await putProject(updated)
        pendingPersistRef.current = null
        assetsDebugLog.persistProject(updated.id, 'gameState saved — assets store unchanged')

        setProjects(prev => prev.map(item => item.id === updated.id ? updated : item))
        void refreshProjectPreview(projectId, updated)
    }, [refreshProjectPreview])

    const schedulePersist = useCallback((data: ActiveBoardPersistPayload) => {
        if (skipNextPersistRef.current) {
            return
        }

        pendingPersistRef.current = data

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null
            void flushPendingSave()
        }, AUTOSAVE_DELAY_MS)
    }, [flushPendingSave])

    const persistProjectData = useCallback((data: ActiveBoardPersistPayload) => {
        schedulePersist(data)
    }, [schedulePersist])

    const getPersistDataForSession = useCallback((
        projectId: string,
        kind: ProjectSessionKind,
    ): ProjectPersistData | null => {
        if (kind === 'visited') {
            const room = visitedRoomsRef.current.find(item => item.localProjectId === projectId)

            if (!room) {
                return null
            }

            return getProjectPersistData(visitedRoomAsProject(room))
        }

        const project = projectsRef.current.find(item => item.id === projectId)

        if (!project) {
            return null
        }

        return getProjectPersistData(project)
    }, [])

    const persistProjectDataForSession = useCallback(async (
        projectId: string,
        kind: ProjectSessionKind,
        data: ProjectPersistData,
    ) => {
        if (kind === 'visited') {
            const room = visitedRoomsRef.current.find(item => item.localProjectId === projectId)

            if (!room) {
                return
            }

            const updated: VisitedRoom = {
                ...room,
                figureCatalog: data.figureCatalog,
                figureTeams: data.figureTeams,
                catalogHistory: data.catalogHistory,
                boards: data.boards,
                activeBoardId: data.activeBoardId,
                updatedAt: Date.now(),
                lastVisitedAt: Date.now(),
            }

            await putVisitedRoom(updated, { protectHostProjectId: updated.hostProjectId })
            assetsDebugLog.persistProject(updated.localProjectId, 'visited room saved (collab session)')

            setVisitedRooms(prev => prev.map(item => item.localProjectId === projectId ? updated : item))

            if (currentProjectIdRef.current === projectId && currentProjectKindRef.current === 'visited') {
                void refreshProjectPreview(projectId, updated)
            }

            return
        }

        const project = projectsRef.current.find(item => item.id === projectId)

        if (!project) {
            return
        }

        const updated: Project = {
            ...project,
            figureCatalog: data.figureCatalog,
            figureTeams: data.figureTeams,
            catalogHistory: data.catalogHistory,
            boards: data.boards,
            activeBoardId: data.activeBoardId,
            updatedAt: Date.now(),
        }

        await putProject(updated)
        assetsDebugLog.persistProject(updated.id, 'gameState saved (collab session)')

        setProjects(prev => prev.map(item => item.id === updated.id ? updated : item))

        if (currentProjectIdRef.current === projectId && currentProjectKindRef.current === 'local') {
            void refreshProjectPreview(projectId, updated)
        }
    }, [refreshProjectPreview])

    const migrateProjectInlineAssets = useCallback(async (project: Project): Promise<Project> => {
        let nextBoards = project.boards
        let changed = false

        nextBoards = await Promise.all(project.boards.map(async (board) => {
            const { gameState, migrated } = await migrateInlineAssets(project.id, board.gameState)

            if (!migrated) {
                return board
            }

            changed = true
            return {
                ...board,
                gameState,
            }
        }))

        if (!changed) {
            return project
        }

        const updated: Project = {
            ...project,
            boards: nextBoards,
            updatedAt: Date.now(),
        }

        await putProject(updated)
        return updated
    }, [])

    const bootstrapGenerationRef = useRef(0)

    useEffect(() => {
        const generation = ++bootstrapGenerationRef.current
        let cancelled = false

        async function bootstrap() {
            profileDebug('bootstrap', 'start', { generation })
            projectsBootstrapLog.start(generation)

            try {
                const [rawProjects, loadedVisitedRooms] = await Promise.all([
                    getAllProjects(),
                    getAllVisitedRooms(),
                ])
                profileDebug('bootstrap', 'projects.fetched', { count: rawProjects.length, generation })
                projectsBootstrapLog.fetchedFromDb(
                    rawProjects.length,
                    rawProjects.map(project => ({
                        id: project.id,
                        name: project.name,
                        updatedAt: project.updatedAt,
                    })),
                )

                let loaded: Project[] = []
                let failedCount = 0

                for (const project of rawProjects) {
                    const format = project.boards?.length
                        ? `multi-board(${project.boards.length})`
                        : project.gameState
                            ? 'legacy-single'
                            : 'unknown'

                    projectsBootstrapLog.migrateAttempt({
                        id: project.id,
                        name: project.name,
                        format,
                        catalogFigures: project.figureCatalog?.length ?? 0,
                    })

                    try {
                        const migrated = migrateProject(project)
                        loaded.push(migrated)
                        projectsBootstrapLog.migrateOk({
                            id: migrated.id,
                            name: migrated.name,
                            boards: migrated.boards.length,
                        })
                    } catch (error) {
                        failedCount += 1
                        projectsBootstrapLog.migrateFailed(
                            { id: project.id, name: project.name },
                            error,
                        )
                    }
                }

                const migratedLoaded: Project[] = []

                for (const project of loaded) {
                    try {
                        migratedLoaded.push(await migrateProjectInlineAssets(project))
                    } catch (error) {
                        failedCount += 1
                        projectsBootstrapLog.inlineAssetsFailed(
                            { id: project.id, name: project.name },
                            error,
                        )
                        migratedLoaded.push(project)
                    }
                }

                loaded = migratedLoaded
                projectsBootstrapLog.summary(rawProjects.length, loaded.length, failedCount)

                if (loaded.length === 0) {
                    const project = createEmptyProject(getDefaultProjectName(0))
                    await putProject(project)
                    loaded = [project]
                    projectsBootstrapLog.createdFallbackEmpty(project.name)
                }

                let savedId = await getCurrentProjectId()
                let savedKind = await getCurrentProjectKind()

                if (savedKind === 'visited') {
                    const room = loadedVisitedRooms.find(item => item.localProjectId === savedId)

                    if (!room) {
                        savedKind = 'local'
                    }
                } else if (!savedId || !loaded.some(item => item.id === savedId)) {
                    savedId = loaded[0].id
                    savedKind = 'local'
                }

                if (cancelled || generation !== bootstrapGenerationRef.current) {
                    projectsBootstrapLog.bootstrapCancelled(generation)
                    return
                }

                setProjects(loaded)
                setVisitedRooms(loadedVisitedRooms)
                await applyCurrentSession(savedId ?? loaded[0].id, savedKind)
                projectsBootstrapLog.ready(savedId ?? loaded[0].id, loaded.length, loadedVisitedRooms.length)
                setIsReady(true)
            } catch (error) {
                projectsBootstrapLog.bootstrapFailed(error)
                profileDebug('bootstrap', 'failed', { generation, error: String(error) })

                if (cancelled || generation !== bootstrapGenerationRef.current) {
                    return
                }

                try {
                    const project = createEmptyProject(getDefaultProjectName(0))
                    await putProject(project)
                    setProjects([project])
                    setVisitedRooms([])
                    await applyCurrentSession(project.id, 'local')
                } catch (fallbackError) {
                    projectsBootstrapLog.bootstrapFailed(fallbackError)
                    setProjects([])
                    setVisitedRooms([])
                } finally {
                    setIsReady(true)
                }
            }
        }

        void bootstrap()

        return () => {
            cancelled = true

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [applyCurrentSession])

    useEffect(() => {
        return () => {
            void flushPendingSave()
        }
    }, [flushPendingSave])

    const createProject = useCallback(async (name?: string) => {
        await flushPendingSave()

        const projectName = name ?? getDefaultProjectName(projectsRef.current.length)
        const project = createEmptyProject(projectName)

        await putProject(project)
        setProjects(prev => [project, ...prev])
        skipNextPersistRef.current = true
        await applyCurrentSession(project.id, 'local')
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const renameProject = useCallback(async (id: string, name: string) => {
        const trimmed = name.trim()

        if (!trimmed) {
            return
        }

        const project = projectsRef.current.find(item => item.id === id)

        if (!project) {
            return
        }

        const updated: Project = {
            ...project,
            name: trimmed,
            updatedAt: Date.now(),
        }

        await putProject(updated)
        setProjects(prev => prev.map(item => item.id === id ? updated : item))
    }, [])

    const switchProject = useCallback(async (id: string) => {
        if (id === currentProjectIdRef.current && currentProjectKindRef.current === 'local') {
            return
        }

        await flushPendingSave()

        const project = projectsRef.current.find(item => item.id === id)

        if (!project) {
            return
        }

        skipNextPersistRef.current = true
        await applyCurrentSession(id, 'local')
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const switchVisitedRoom = useCallback(async (hostProjectId: string) => {
        await flushPendingSave()

        const room = visitedRoomsRef.current.find(item => item.hostProjectId === hostProjectId)

        if (!room) {
            return
        }

        skipNextPersistRef.current = true
        await applyCurrentSession(room.localProjectId, 'visited')
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const switchProjectSession = useCallback(async (projectId: string, kind: ProjectSessionKind) => {
        if (projectId === currentProjectIdRef.current && currentProjectKindRef.current === kind) {
            return
        }

        await flushPendingSave()

        if (kind === 'visited') {
            const room = visitedRoomsRef.current.find(item => item.localProjectId === projectId)

            if (!room) {
                return
            }
        } else {
            const project = projectsRef.current.find(item => item.id === projectId)

            if (!project) {
                return
            }
        }

        skipNextPersistRef.current = true
        await applyCurrentSession(projectId, kind)
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const promoteVisitedRoomToLocal = useCallback(async (hostProjectId: string) => {
        await flushPendingSave()

        const room = visitedRoomsRef.current.find(item => item.hostProjectId === hostProjectId)

        if (!room) {
            return
        }

        const promoted = await promoteVisitedRoomToLocalProject(room, projectsRef.current)
        const nextVisitedRooms = await getAllVisitedRooms()

        setProjects(prev => [promoted, ...prev])
        setVisitedRooms(nextVisitedRooms)

        skipNextPersistRef.current = true
        await applyCurrentSession(promoted.id, 'local')
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const deleteProject = useCallback(async (id: string) => {
        await flushPendingSave()

        let nextProjects = projectsRef.current.filter(item => item.id !== id)

        if (nextProjects.length === 0) {
            const project = createEmptyProject(getDefaultProjectName(0))
            await putProject(project)
            nextProjects = [project]
        }

        await deleteProjectFromDb(id)
        await deleteAssetsByProjectId(id)
        setProjects(nextProjects)

        if (currentProjectIdRef.current === id && currentProjectKindRef.current === 'local') {
            skipNextPersistRef.current = true
            await applyCurrentSession(nextProjects[0].id, 'local')
            bumpGameSession()
            skipNextPersistRef.current = false
        }
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const replaceProjectGameState = useCallback(async (id: string, gameState: GameState) => {
        const project = projectsRef.current.find(item => item.id === id)

        if (!project) {
            return
        }

        const activeBoard = getActiveBoard(project)
        const boards = project.boards.map(board => (
            board.id === activeBoard.id
                ? { ...board, gameState, updatedAt: Date.now() }
                : board
        ))

        const updated: Project = {
            ...project,
            boards,
            updatedAt: Date.now(),
        }

        await putProject(updated)
        setProjects(prev => prev.map(item => item.id === id ? updated : item))
    }, [])

    const updateCurrentProjectBoards = useCallback(async (
        updater: (project: Project) => Project,
    ) => {
        const projectId = currentProjectIdRef.current

        if (!projectId) {
            return null
        }

        if (currentProjectKindRef.current === 'visited') {
            const room = visitedRoomsRef.current.find(item => item.localProjectId === projectId)

            if (!room) {
                return null
            }

            const project = updater(visitedRoomAsProject(room))
            const updated: VisitedRoom = {
                ...room,
                figureCatalog: project.figureCatalog,
                figureTeams: project.figureTeams,
                catalogHistory: project.catalogHistory,
                boards: project.boards,
                activeBoardId: project.activeBoardId,
                previewDataUrl: project.previewDataUrl,
                updatedAt: Date.now(),
                lastVisitedAt: Date.now(),
            }

            await putVisitedRoom(updated, { protectHostProjectId: updated.hostProjectId })
            setVisitedRooms(prev => prev.map(item => item.localProjectId === projectId ? updated : item))
            return project
        }

        const project = projectsRef.current.find(item => item.id === projectId)

        if (!project) {
            return null
        }

        const updated = updater(project)
        await putProject(updated)
        setProjects(prev => prev.map(item => item.id === updated.id ? updated : item))
        return updated
    }, [])

    const switchBoard = useCallback(async (boardId: string) => {
        const project = currentProjectRef.current

        if (!project || project.activeBoardId === boardId) {
            return
        }

        if (!project.boards.some(board => board.id === boardId)) {
            return
        }

        await flushPendingSave()

        await updateCurrentProjectBoards(current => ({
            ...current,
            activeBoardId: boardId,
            updatedAt: Date.now(),
        }))

        skipNextPersistRef.current = true
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [bumpGameSession, flushPendingSave, updateCurrentProjectBoards])

    const createBoard = useCallback(async (name?: string) => {
        await flushPendingSave()

        await updateCurrentProjectBoards(project => {
            const board = createEmptyBoardDocument(resolveBoardName(project.boards, name))
            return {
                ...project,
                boards: [...project.boards, board],
                activeBoardId: board.id,
                updatedAt: Date.now(),
            }
        })

        skipNextPersistRef.current = true
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [bumpGameSession, flushPendingSave, updateCurrentProjectBoards])

    const renameBoard = useCallback(async (boardId: string, name: string) => {
        const trimmed = name.trim()

        if (!trimmed) {
            return
        }

        await updateCurrentProjectBoards(project => ({
            ...project,
            boards: project.boards.map(board => (
                board.id === boardId ? { ...board, name: trimmed } : board
            )),
            updatedAt: Date.now(),
        }))
    }, [updateCurrentProjectBoards])

    const deleteBoard = useCallback(async (boardId: string) => {
        await flushPendingSave()

        const project = currentProjectRef.current

        if (!project || project.boards.length <= 1) {
            return
        }

        const nextBoards = project.boards.filter(board => board.id !== boardId)

        if (nextBoards.length === project.boards.length) {
            return
        }

        const deletedIndex = project.boards.findIndex(board => board.id === boardId)

        const nextActiveBoardId = project.activeBoardId === boardId
            ? nextBoards[Math.min(deletedIndex, nextBoards.length - 1)]!.id
            : project.activeBoardId

        await updateCurrentProjectBoards(() => ({
            ...project,
            boards: nextBoards,
            activeBoardId: nextActiveBoardId,
            updatedAt: Date.now(),
        }))

        if (project.activeBoardId === boardId) {
            skipNextPersistRef.current = true
            bumpGameSession()
            skipNextPersistRef.current = false
        }
    }, [bumpGameSession, flushPendingSave, updateCurrentProjectBoards])

    const duplicateBoard = useCallback(async (boardId: string) => {
        await flushPendingSave()

        await updateCurrentProjectBoards(project => {
            const source = project.boards.find(board => board.id === boardId)

            if (!source) {
                return project
            }

            const copy = createEmptyBoardDocument(
                resolveBoardName(project.boards, `${source.name} (копия)`),
                structuredClone(source.gameState),
                structuredClone(source.figuresHistory),
                structuredClone(source.boardHistory),
            )

            return {
                ...project,
                boards: [...project.boards, copy],
                activeBoardId: copy.id,
                updatedAt: Date.now(),
            }
        })

        skipNextPersistRef.current = true
        bumpGameSession()
        skipNextPersistRef.current = false
    }, [bumpGameSession, flushPendingSave, updateCurrentProjectBoards])

    const currentProjectRef = useRef(currentProject)
    currentProjectRef.current = currentProject

    const exportProject = useCallback(async (id: string) => {
        await flushPendingSave()

        const project = projectsRef.current.find(item => item.id === id)

        if (!project) {
            return
        }

        await exportProjectToFile(project)
    }, [flushPendingSave])

    const importCollaborativeProject = useCallback(async (snapshot: CollabSnapshot, roomId: string) => {
        await flushPendingSave()

        const room = await importCollabSnapshotAsVisitedRoom(snapshot, roomId)
        const nextVisitedRooms = await getAllVisitedRooms()

        setVisitedRooms(nextVisitedRooms)

        skipNextPersistRef.current = true
        await applyCurrentSession(room.localProjectId, 'visited')
        bumpGameSession()
        skipNextPersistRef.current = false

        return visitedRoomToProject(room)
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const importProjectsFromFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) {
            return null
        }

        await flushPendingSave()

        let currentList = projectsRef.current
        let lastImported: Project | null = null

        for (const file of files) {
            const imported = await importProjectFromFile(file, currentList)
            currentList = [imported, ...currentList]
            lastImported = imported
        }

        if (!lastImported) {
            return null
        }

        setProjects(currentList)

        skipNextPersistRef.current = true
        await applyCurrentSession(lastImported.id, 'local')
        bumpGameSession()
        skipNextPersistRef.current = false

        return lastImported
    }, [applyCurrentSession, bumpGameSession, flushPendingSave])

    const getCurrentHostAssetIdRemap = useCallback((): Record<number, number> | undefined => {
        if (currentProjectKindRef.current !== 'visited' || !currentProjectIdRef.current) {
            return undefined
        }

        const room = visitedRoomsRef.current.find(item => item.localProjectId === currentProjectIdRef.current)
        return room?.hostAssetIdRemap
    }, [])

    const appendHostAssetIdRemap = useCallback(async (hostId: number, localId: number) => {
        if (currentProjectKindRef.current !== 'visited' || !currentProjectIdRef.current) {
            return
        }

        const room = visitedRoomsRef.current.find(item => item.localProjectId === currentProjectIdRef.current)

        if (!room) {
            return
        }

        const hostAssetIdRemap = {
            ...room.hostAssetIdRemap,
            [hostId]: localId,
        }

        const updated: VisitedRoom = {
            ...room,
            hostAssetIdRemap,
            updatedAt: Date.now(),
        }

        await putVisitedRoom(updated, { protectHostProjectId: room.hostProjectId })
        setVisitedRooms(prev => prev.map(item => item.localProjectId === updated.localProjectId ? updated : item))
        assetsDebugLog.warn(`hostAssetIdRemap ${hostId}→${localId} host=${room.hostProjectId.slice(0, 8)}`, { hostId, localId })
    }, [])

    const getHostAssetIdRemapFor = useCallback((localProjectId: string): Record<number, number> | undefined => {
        const room = visitedRoomsRef.current.find(item => item.localProjectId === localProjectId)
        return room?.hostAssetIdRemap
    }, [])

    const appendHostAssetIdRemapFor = useCallback(async (
        localProjectId: string,
        hostId: number,
        localId: number,
    ) => {
        const room = visitedRoomsRef.current.find(item => item.localProjectId === localProjectId)

        if (!room) {
            return
        }

        const hostAssetIdRemap = {
            ...room.hostAssetIdRemap,
            [hostId]: localId,
        }

        const updated: VisitedRoom = {
            ...room,
            hostAssetIdRemap,
            updatedAt: Date.now(),
        }

        await putVisitedRoom(updated, { protectHostProjectId: room.hostProjectId })
        setVisitedRooms(prev => prev.map(item => item.localProjectId === updated.localProjectId ? updated : item))
        assetsDebugLog.warn(
            `hostAssetIdRemap ${hostId}→${localId} host=${room.hostProjectId.slice(0, 8)}`,
            { hostId, localId },
        )
    }, [])

    const value = useMemo(
        () => ({
            isReady,
            projects,
            visitedRooms,
            currentProject,
            currentProjectId,
            currentProjectKind,
            activeBoardId,
            boards,
            gameSessionEpoch,
            persistProjectData,
            registerPreviewCapture,
            createProject,
            renameProject,
            deleteProject,
            switchProject,
            switchVisitedRoom,
            switchProjectSession,
            switchBoard,
            createBoard,
            renameBoard,
            deleteBoard,
            duplicateBoard,
            promoteVisitedRoomToLocal,
            replaceProjectGameState,
            exportProject,
            importProjectsFromFiles,
            importCollaborativeProject,
            getCurrentHostAssetIdRemap,
            appendHostAssetIdRemap,
            getPersistDataForSession,
            persistProjectDataForSession,
            getHostAssetIdRemapFor,
            appendHostAssetIdRemapFor,
        }),
        [
            isReady,
            projects,
            visitedRooms,
            currentProject,
            currentProjectId,
            currentProjectKind,
            activeBoardId,
            boards,
            gameSessionEpoch,
            persistProjectData,
            registerPreviewCapture,
            createProject,
            renameProject,
            deleteProject,
            switchProject,
            switchVisitedRoom,
            switchProjectSession,
            switchBoard,
            createBoard,
            renameBoard,
            deleteBoard,
            duplicateBoard,
            promoteVisitedRoomToLocal,
            replaceProjectGameState,
            exportProject,
            importProjectsFromFiles,
            importCollaborativeProject,
            getCurrentHostAssetIdRemap,
            appendHostAssetIdRemap,
            getPersistDataForSession,
            persistProjectDataForSession,
            getHostAssetIdRemapFor,
            appendHostAssetIdRemapFor,
        ],
    )

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    )
}

export function useProjectContext() {
    return useContext(ProjectContext)
}
