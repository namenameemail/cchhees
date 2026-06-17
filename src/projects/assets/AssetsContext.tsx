import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useProjectContext } from '../ProjectContext'
import { useCollab } from '../../collab/CollabProvider'
import {
    deleteAsset as deleteAssetFromDb,
    getAssetRecord,
    getAssetsByProjectId,
    putAsset,
} from '../db'
import { isAllowedAssetFile, isFontAsset, isImageAsset, isModelAsset } from './assetKinds'
import { ProjectAssetView } from './types'
import { importLiveAsset } from '../../collab/liveAsset'
import { ProjectFileAsset } from '../projectFile'
import { assetsDebugLog } from './assetsDebugLog'

export interface AssetsContextValue {
    assets: ProjectAssetView[]
    isLoading: boolean
    addAsset: (file: File) => Promise<void>
    removeAsset: (id: number) => Promise<void>
    getAssetUrl: (id: number) => string | undefined
    getAssetById: (id: number) => ProjectAssetView | undefined
    isSvgAsset: (asset: ProjectAssetView) => boolean
    isFontAsset: (asset: ProjectAssetView) => boolean
    isImageAsset: (asset: ProjectAssetView) => boolean
    isModelAsset: (asset: ProjectAssetView) => boolean
}

const defaultContextValue: AssetsContextValue = {
    assets: [],
    isLoading: false,
    addAsset: async () => {},
    removeAsset: async () => {},
    getAssetUrl: () => undefined,
    getAssetById: () => undefined,
    isSvgAsset: () => false,
    isFontAsset: () => false,
    isImageAsset: () => false,
    isModelAsset: () => false,
}

export const AssetsContext = createContext<AssetsContextValue>(defaultContextValue)

function recordToView(record: Awaited<ReturnType<typeof getAssetsByProjectId>>[number]): ProjectAssetView {
    return {
        id: record.id,
        name: record.name,
        mimeType: record.mimeType,
        size: record.size,
        objectUrl: URL.createObjectURL(record.blob),
    }
}

export function isSvgAsset(asset: Pick<ProjectAssetView, 'mimeType' | 'name'>): boolean {
    return asset.mimeType === 'image/svg+xml' || asset.name.toLowerCase().endsWith('.svg')
}

export interface AssetsProviderProps {
    children: React.ReactNode
}

export function AssetsProvider({ children }: AssetsProviderProps) {
    const { isReady, currentProjectId, appendHostAssetIdRemap } = useProjectContext()
    const { registerAssetsBridge, broadcastAssetAdded, broadcastAssetRemoved } = useCollab()
    const [assets, setAssets] = useState<ProjectAssetView[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const objectUrlsRef = useRef<string[]>([])
    const loadGenerationRef = useRef(0)
    const loadedProjectIdRef = useRef<string | null>(null)

    const revokeAllObjectUrls = useCallback(() => {
        for (const url of objectUrlsRef.current) {
            URL.revokeObjectURL(url)
        }
        objectUrlsRef.current = []
    }, [])

    const loadAssets = useCallback(async (projectId: string, reason: string) => {
        const generation = loadGenerationRef.current + 1
        loadGenerationRef.current = generation

        assetsDebugLog.loadStart(projectId, generation, reason)
        setIsLoading(true)

        try {
            const records = await getAssetsByProjectId(projectId)
            const stale = generation !== loadGenerationRef.current

            if (stale) {
                assetsDebugLog.loadComplete(
                    projectId,
                    generation,
                    records.map(record => record.id),
                    true,
                )
                return
            }

            revokeAllObjectUrls()
            const views = records.map(record => {
                const view = recordToView(record)
                objectUrlsRef.current.push(view.objectUrl)
                return view
            })

            setAssets(views)
            loadedProjectIdRef.current = projectId
            assetsDebugLog.loadComplete(projectId, generation, views.map(view => view.id), false)
        } catch (error) {
            assetsDebugLog.warn(`load failed: ${String(error)}`, { projectId, generation })
        } finally {
            if (generation === loadGenerationRef.current) {
                setIsLoading(false)
            }
        }
    }, [revokeAllObjectUrls])

    // Assets live in a separate IndexedDB store — reload only when project id changes,
    // not when project.gameState is persisted (that would race with addAsset).
    useEffect(() => {
        if (!isReady || !currentProjectId) {
            assetsDebugLog.effectRun(currentProjectId, 'clear — not ready')
            loadGenerationRef.current += 1
            loadedProjectIdRef.current = null
            revokeAllObjectUrls()
            setAssets([])
            return
        }

        if (loadedProjectIdRef.current === currentProjectId) {
            assetsDebugLog.loadSkipped(`same project ${currentProjectId.slice(0, 8)} (persist does not reload assets)`)
            return
        }

        assetsDebugLog.effectRun(currentProjectId, 'project id changed → load from IndexedDB')
        let cancelled = false

        void (async () => {
            if (!cancelled) {
                await loadAssets(currentProjectId, 'project-switch')
            }
        })()

        return () => {
            cancelled = true
        }
    }, [isReady, currentProjectId, loadAssets, revokeAllObjectUrls])

    useEffect(() => {
        registerAssetsBridge({
            onRemoteAsset: async (asset: ProjectFileAsset) => {
                const projectId = currentProjectId

                if (!projectId) {
                    assetsDebugLog.warn('remote asset skipped: no project')
                    return
                }

                const importResult = await importLiveAsset(projectId, asset)
                const id = importResult.id

                if (importResult.remappedFrom != null) {
                    await appendHostAssetIdRemap(importResult.remappedFrom, importResult.id)
                }

                const record = await getAssetRecord(id)

                if (!record) {
                    assetsDebugLog.warn(`remote asset missing after import id=${id}`)
                    return
                }

                setAssets(prev => {
                    if (prev.some(item => item.id === id)) {
                        assetsDebugLog.loadSkipped(`remote id=${id} already in list`)
                        return prev
                    }

                    const view = recordToView(record)
                    objectUrlsRef.current.push(view.objectUrl)
                    assetsDebugLog.addRemote(id, asset.name, projectId)
                    return [...prev, view]
                })
            },
            onRemoteAssetRemoved: async (assetId: number) => {
                let removedName: string | undefined

                setAssets(prev => {
                    const existing = prev.find(item => item.id === assetId)

                    if (!existing) {
                        return prev
                    }

                    removedName = existing.name
                    URL.revokeObjectURL(existing.objectUrl)
                    objectUrlsRef.current = objectUrlsRef.current.filter(url => url !== existing.objectUrl)
                    return prev.filter(item => item.id !== assetId)
                })

                await deleteAssetFromDb(assetId)
                assetsDebugLog.removeRemote(assetId, removedName)
            },
        })

        return () => registerAssetsBridge(null)
    }, [currentProjectId, registerAssetsBridge, appendHostAssetIdRemap])

    const getAssetById = useCallback((id: number) => {
        return assets.find(asset => asset.id === id)
    }, [assets])

    const getAssetUrl = useCallback((id: number) => {
        return getAssetById(id)?.objectUrl
    }, [getAssetById])

    const addAsset = useCallback(async (file: File) => {
        if (!currentProjectId) {
            assetsDebugLog.warn('add skipped: no project')
            return
        }

        if (!isAllowedAssetFile(file)) {
            assetsDebugLog.warn(`add skipped: disallowed file «${file.name}» type=${file.type}`)
            return
        }

        const id = await putAsset({
            projectId: currentProjectId,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            blob: file,
            size: file.size,
        })

        const objectUrl = URL.createObjectURL(file)
        objectUrlsRef.current.push(objectUrl)

        const view: ProjectAssetView = {
            id,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            objectUrl,
        }

        setAssets(prev => [...prev, view])
        assetsDebugLog.addLocal(id, file.name, currentProjectId)
        await broadcastAssetAdded(id)
    }, [currentProjectId, broadcastAssetAdded])

    const removeAsset = useCallback(async (id: number) => {
        const asset = assets.find(item => item.id === id)
        if (asset) {
            URL.revokeObjectURL(asset.objectUrl)
            objectUrlsRef.current = objectUrlsRef.current.filter(url => url !== asset.objectUrl)
        }

        await deleteAssetFromDb(id)
        setAssets(prev => prev.filter(item => item.id !== id))
        assetsDebugLog.removeLocal(id, asset?.name)
        await broadcastAssetRemoved(id)
    }, [assets, broadcastAssetRemoved])

    const value = useMemo(
        () => ({
            assets,
            isLoading,
            addAsset,
            removeAsset,
            getAssetUrl,
            getAssetById,
            isSvgAsset,
            isFontAsset,
            isImageAsset,
            isModelAsset,
        }),
        [assets, isLoading, addAsset, removeAsset, getAssetUrl, getAssetById],
    )

    return (
        <AssetsContext.Provider value={value}>
            {children}
        </AssetsContext.Provider>
    )
}

export function useAssetsContext() {
    return useContext(AssetsContext)
}
