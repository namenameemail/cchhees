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
import {
    deleteAsset as deleteAssetFromDb,
    getAssetsByProjectId,
    putAsset,
} from '../db'
import { isAllowedAssetFile, isFontAsset, isImageAsset } from './assetKinds'
import { ProjectAssetView } from './types'

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
    const { currentProject, isReady } = useProjectContext()
    const [assets, setAssets] = useState<ProjectAssetView[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const objectUrlsRef = useRef<string[]>([])

    const revokeAllObjectUrls = useCallback(() => {
        for (const url of objectUrlsRef.current) {
            URL.revokeObjectURL(url)
        }
        objectUrlsRef.current = []
    }, [])

    const loadAssets = useCallback(async (projectId: string) => {
        setIsLoading(true)
        try {
            const records = await getAssetsByProjectId(projectId)
            revokeAllObjectUrls()
            const views = records.map(record => {
                const view = recordToView(record)
                objectUrlsRef.current.push(view.objectUrl)
                return view
            })
            setAssets(views)
        } finally {
            setIsLoading(false)
        }
    }, [revokeAllObjectUrls])

    useEffect(() => {
        if (!isReady || !currentProject) {
            revokeAllObjectUrls()
            setAssets([])
            return
        }

        let cancelled = false

        async function bootstrap() {
            if (!cancelled) {
                await loadAssets(currentProject!.id)
            }
        }

        void bootstrap()

        return () => {
            cancelled = true
            revokeAllObjectUrls()
        }
    }, [isReady, currentProject, loadAssets, revokeAllObjectUrls])

    const getAssetById = useCallback((id: number) => {
        return assets.find(asset => asset.id === id)
    }, [assets])

    const getAssetUrl = useCallback((id: number) => {
        return getAssetById(id)?.objectUrl
    }, [getAssetById])

    const addAsset = useCallback(async (file: File) => {
        if (!currentProject) {
            return
        }

        if (!isAllowedAssetFile(file)) {
            return
        }

        const id = await putAsset({
            projectId: currentProject.id,
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
    }, [currentProject])

    const removeAsset = useCallback(async (id: number) => {
        const asset = assets.find(item => item.id === id)
        if (asset) {
            URL.revokeObjectURL(asset.objectUrl)
            objectUrlsRef.current = objectUrlsRef.current.filter(url => url !== asset.objectUrl)
        }

        await deleteAssetFromDb(id)
        setAssets(prev => prev.filter(item => item.id !== id))
    }, [assets])

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
