import { useMemo } from 'react'
import { CellParameters, CellShape } from '../../game/types/cells'
import { useAssetsContext } from './AssetsContext'

export function useAssetHref(cellParams?: CellParameters): string | undefined {
    const { getAssetUrl } = useAssetsContext()

    return useMemo(() => {
        const svgParams = cellParams?.paramsByShape?.[CellShape.svg]
        if (!svgParams) {
            return undefined
        }

        if (svgParams.assetId != null) {
            return getAssetUrl(svgParams.assetId)
        }

        const legacyFile = (svgParams as { file?: string }).file
        if (typeof legacyFile === 'string' && legacyFile.length > 0) {
            return legacyFile
        }

        return undefined
    }, [cellParams, getAssetUrl])
}
