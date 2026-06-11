import { useMemo } from 'react'
import { CellParameters, CellShape } from '../../game/types/cells'
import { getCellImageShapeParams, isCellImageShape } from '../../game/cellImageShape'
import { useAssetsContext } from './AssetsContext'

export function useAssetHref(cellParams?: CellParameters): string | undefined {
    const { getAssetUrl } = useAssetsContext()

    return useMemo(() => {
        if (!isCellImageShape(cellParams?.shape)) {
            return undefined
        }

        const imageParams = getCellImageShapeParams(cellParams)

        if (!imageParams) {
            return undefined
        }

        if (imageParams.assetId != null) {
            return getAssetUrl(imageParams.assetId)
        }

        const legacyFile = (imageParams as { file?: string }).file
        if (typeof legacyFile === 'string' && legacyFile.length > 0) {
            return legacyFile
        }

        return undefined
    }, [cellParams, getAssetUrl])
}
