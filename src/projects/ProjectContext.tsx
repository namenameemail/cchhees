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
    getCurrentProjectId,
    putProject,
    setCurrentProjectId,
} from './db'
import { createEmptyProject, getDefaultProjectName } from './createProject'
import { exportProjectToFile, importProjectFromFile } from './projectFile'
import { Project, ProjectPersistData, migrateProject } from './types'
import { GameState } from '../game/types/gameState'
import { migrateInlineAssets } from './assets/migrateInlineAssets'
import { profileDebug } from '../profiler'

const AUTOSAVE_DELAY_MS = 400

export interface ProjectContextValue {
    isReady: boolean
    projects: Project[]
    currentProject: Project | null
    currentProjectId: string | null
    persistProjectData: (data: ProjectPersistData) => void
    createProject: (name?: string) => Promise<void>
    renameProject: (id: string, name: string) => Promise<void>
    deleteProject: (id: string) => Promise<void>
    switchProject: (id: string) => Promise<void>
    replaceProjectGameState: (id: string, gameState: GameState) => Promise<void>
    exportProject: (id: string) => Promise<void>
    importProjectsFromFiles: (files: File[]) => Promise<Project | null>
}

const defaultContextValue: ProjectContextValue = {
    isReady: false,
    projects: [],
    currentProject: null,
    currentProjectId: null,
    persistProjectData: () => {},
    createProject: async () => {},
    renameProject: async () => {},
    deleteProject: async () => {},
    switchProject: async () => {},
    replaceProjectGameState: async () => {},
    exportProject: async () => {},
    importProjectsFromFiles: async () => null,
}

export const ProjectContext = createContext<ProjectContextValue>(defaultContextValue)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null)

    const projectsRef = useRef(projects)
    const currentProjectIdRef = useRef(currentProjectId)
    const pendingPersistRef = useRef<ProjectPersistData | null>(null)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const skipNextPersistRef = useRef(false)

    projectsRef.current = projects
    currentProjectIdRef.current = currentProjectId

    const currentProject = useMemo(
        () => projects.find(p => p.id === currentProjectId) ?? null,
        [projects, currentProjectId],
    )

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

        const project = projectsRef.current.find(p => p.id === projectId)
        if (!project) {
            return
        }

        const updated: Project = {
            ...project,
            gameState: pending.state,
            figuresHistory: pending.figuresHistory,
            boardHistory: pending.boardHistory,
            updatedAt: Date.now(),
        }

        await putProject(updated)
        pendingPersistRef.current = null

        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    }, [])

    const schedulePersist = useCallback((data: ProjectPersistData) => {
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

    const persistProjectData = useCallback((data: ProjectPersistData) => {
        schedulePersist(data)
    }, [schedulePersist])

    const applyCurrentProject = useCallback(async (id: string) => {
        await setCurrentProjectId(id)
        setCurrentProjectIdState(id)
    }, [])

    const migrateProjectInlineAssets = useCallback(async (project: Project): Promise<Project> => {
        const { gameState, migrated } = await migrateInlineAssets(project.id, project.gameState)
        if (!migrated) {
            return project
        }

        const updated: Project = {
            ...project,
            gameState,
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

            try {
                const rawProjects = await getAllProjects()
                profileDebug('bootstrap', 'projects.fetched', { count: rawProjects.length, generation })

                let loaded: Project[] = []

                for (const project of rawProjects) {
                    try {
                        loaded.push(migrateProject(project))
                    } catch (error) {
                        console.error('[ProjectProvider] migrateProject failed:', project.id, error)
                        profileDebug('bootstrap', 'project.migrate.error', {
                            projectId: project.id,
                            error: String(error),
                        })
                    }
                }

                loaded = await Promise.all(loaded.map(async (project) => {
                    try {
                        const { gameState, migrated } = await migrateInlineAssets(project.id, project.gameState)
                        if (!migrated) {
                            return project
                        }

                        const updated: Project = {
                            ...project,
                            gameState,
                            updatedAt: Date.now(),
                        }

                        await putProject(updated)
                        return updated
                    } catch (error) {
                        console.error('[ProjectProvider] migrateInlineAssets failed:', project.id, error)
                        profileDebug('bootstrap', 'project.inlineAssets.error', {
                            projectId: project.id,
                            error: String(error),
                        })
                        return project
                    }
                }))

                if (loaded.length === 0) {
                    const project = createEmptyProject(getDefaultProjectName(0))
                    await putProject(project)
                    loaded = [project]
                }

                let savedId = await getCurrentProjectId()
                if (!savedId || !loaded.some(p => p.id === savedId)) {
                    savedId = loaded[0].id
                }

                if (cancelled || generation !== bootstrapGenerationRef.current) {
                    profileDebug('bootstrap', 'cancelled', { generation })
                    return
                }

                setProjects(loaded)
                await applyCurrentProject(savedId)
                setIsReady(true)
                profileDebug('bootstrap', 'ready', {
                    generation,
                    projectId: savedId,
                    count: loaded.length,
                })
            } catch (error) {
                console.error('[ProjectProvider] bootstrap failed:', error)
                profileDebug('bootstrap', 'failed', {
                    generation,
                    error: String(error),
                })

                if (cancelled || generation !== bootstrapGenerationRef.current) {
                    return
                }

                try {
                    const project = createEmptyProject(getDefaultProjectName(0))
                    await putProject(project)
                    setProjects([project])
                    await applyCurrentProject(project.id)
                } catch (fallbackError) {
                    console.error('[ProjectProvider] bootstrap fallback failed:', fallbackError)
                    setProjects([])
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
    }, [applyCurrentProject])

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
        await applyCurrentProject(project.id)
        skipNextPersistRef.current = false
    }, [applyCurrentProject, flushPendingSave])

    const renameProject = useCallback(async (id: string, name: string) => {
        const trimmed = name.trim()
        if (!trimmed) {
            return
        }

        const project = projectsRef.current.find(p => p.id === id)
        if (!project) {
            return
        }

        const updated: Project = {
            ...project,
            name: trimmed,
            updatedAt: Date.now(),
        }

        await putProject(updated)
        setProjects(prev => prev.map(p => p.id === id ? updated : p))
    }, [])

    const switchProject = useCallback(async (id: string) => {
        if (id === currentProjectIdRef.current) {
            return
        }

        await flushPendingSave()

        const project = projectsRef.current.find(p => p.id === id)
        if (!project) {
            return
        }

        skipNextPersistRef.current = true
        await applyCurrentProject(id)
        skipNextPersistRef.current = false
    }, [applyCurrentProject, flushPendingSave])

    const deleteProject = useCallback(async (id: string) => {
        await flushPendingSave()

        let nextProjects = projectsRef.current.filter(p => p.id !== id)

        if (nextProjects.length === 0) {
            const project = createEmptyProject(getDefaultProjectName(0))
            await putProject(project)
            nextProjects = [project]
        }

        await deleteProjectFromDb(id)
        await deleteAssetsByProjectId(id)
        setProjects(nextProjects)

        if (currentProjectIdRef.current === id) {
            skipNextPersistRef.current = true
            await applyCurrentProject(nextProjects[0].id)
            skipNextPersistRef.current = false
        }
    }, [applyCurrentProject, flushPendingSave])

    const replaceProjectGameState = useCallback(async (id: string, gameState: GameState) => {
        const project = projectsRef.current.find(p => p.id === id)
        if (!project) {
            return
        }

        const updated: Project = {
            ...project,
            gameState,
            updatedAt: Date.now(),
        }

        await putProject(updated)
        setProjects(prev => prev.map(p => p.id === id ? updated : p))
    }, [])

    const exportProject = useCallback(async (id: string) => {
        await flushPendingSave()

        const project = projectsRef.current.find(item => item.id === id)

        if (!project) {
            return
        }

        await exportProjectToFile(project)
    }, [flushPendingSave])

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
        await applyCurrentProject(lastImported.id)
        skipNextPersistRef.current = false

        return lastImported
    }, [applyCurrentProject, flushPendingSave])

    const value = useMemo(
        () => ({
            isReady,
            projects,
            currentProject,
            currentProjectId,
            persistProjectData,
            createProject,
            renameProject,
            deleteProject,
            switchProject,
            replaceProjectGameState,
            exportProject,
            importProjectsFromFiles,
        }),
        [
            isReady,
            projects,
            currentProject,
            currentProjectId,
            persistProjectData,
            createProject,
            renameProject,
            deleteProject,
            switchProject,
            replaceProjectGameState,
            exportProject,
            importProjectsFromFiles,
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
