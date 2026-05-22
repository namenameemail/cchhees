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
    deleteProject as deleteProjectFromDb,
    getAllProjects,
    getCurrentProjectId,
    putProject,
    setCurrentProjectId,
} from './db'
import { createEmptyProject, getDefaultProjectName } from './createProject'
import { Project, ProjectPersistData } from './types'

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
            stateHistory: pending.stateHistory,
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

    useEffect(() => {
        let cancelled = false

        async function bootstrap() {
            let loaded = await getAllProjects()

            if (loaded.length === 0) {
                const project = createEmptyProject(getDefaultProjectName(0))
                await putProject(project)
                loaded = [project]
            }

            let savedId = await getCurrentProjectId()
            if (!savedId || !loaded.some(p => p.id === savedId)) {
                savedId = loaded[0].id
            }

            if (cancelled) {
                return
            }

            setProjects(loaded)
            await applyCurrentProject(savedId)
            setIsReady(true)
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
        setProjects(nextProjects)

        if (currentProjectIdRef.current === id) {
            skipNextPersistRef.current = true
            await applyCurrentProject(nextProjects[0].id)
            skipNextPersistRef.current = false
        }
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
