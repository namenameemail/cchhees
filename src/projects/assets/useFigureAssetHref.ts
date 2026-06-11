import { useMemo } from 'react'
import { FigureViewParams } from '../../game/types/figures'
import { useAssetsContext } from './AssetsContext'

export function useFigureAssetHref(viewParams?: FigureViewParams): string | undefined {
    const { getAssetUrl } = useAssetsContext()

    return useMemo(() => {
        if (!viewParams || viewParams.assetId == null) {
            return undefined
        }

        return getAssetUrl(viewParams.assetId)
    }, [viewParams, getAssetUrl])
}
