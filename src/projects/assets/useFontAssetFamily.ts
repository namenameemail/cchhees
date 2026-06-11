import { useEffect } from 'react'
import { getFontFormat } from './assetKinds'
import { useAssetsContext } from './AssetsContext'

const FONT_FAMILY_PREFIX = 'cchhees-font-'

export function getFontFamilyName(assetId: number): string {
    return `${FONT_FAMILY_PREFIX}${assetId}`
}

function ensureFontFace(assetId: number, url: string, format: string, family: string): void {
    const styleId = `cchhees-font-face-${assetId}`

    if (document.getElementById(styleId)) {
        return
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
@font-face {
    font-family: '${family}';
    src: url('${url}') format('${format}');
    font-display: swap;
}
`
    document.head.appendChild(style)
}

export function useFontAssetFamily(fontAssetId?: number | null): string | undefined {
    const { getAssetUrl, getAssetById } = useAssetsContext()

    useEffect(() => {
        if (fontAssetId == null) {
            return
        }

        const asset = getAssetById(fontAssetId)
        const url = getAssetUrl(fontAssetId)

        if (!asset || !url) {
            return
        }

        ensureFontFace(
            fontAssetId,
            url,
            getFontFormat(asset),
            getFontFamilyName(fontAssetId),
        )
    }, [fontAssetId, getAssetById, getAssetUrl])

    if (fontAssetId == null) {
        return undefined
    }

    return getFontFamilyName(fontAssetId)
}
