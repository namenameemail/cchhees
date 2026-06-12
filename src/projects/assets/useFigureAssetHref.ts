import { useEffect, useMemo, useState } from 'react'
import { FigureViewParams } from '../../game/types/figures'
import { getAssetRecord } from '../db'
import { useAssetsContext } from './AssetsContext'

export function useFigureAssetHref(viewParams?: FigureViewParams): string | undefined {
    const { getAssetUrl } = useAssetsContext()
    const assetId = viewParams?.assetId ?? null
    const contextUrl = assetId != null ? getAssetUrl(assetId) : undefined
    const [fallbackUrl, setFallbackUrl] = useState<string | undefined>()

    useEffect(() => {
        if (assetId == null || contextUrl) {
            setFallbackUrl(undefined)
            return
        }

        let cancelled = false
        let objectUrl: string | undefined

        void getAssetRecord(assetId).then(record => {
            if (cancelled || !record) {
                return
            }

            objectUrl = URL.createObjectURL(record.blob)
            setFallbackUrl(objectUrl)
        })

        return () => {
            cancelled = true

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [assetId, contextUrl])

    return useMemo(() => contextUrl ?? fallbackUrl, [contextUrl, fallbackUrl])
}
