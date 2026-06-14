import React, { RefObject, useEffect } from 'react'
import { getFontFormat } from '../../projects/assets/assetKinds'
import { useAssetsContext } from '../../projects/assets/AssetsContext'
import { getFontFamilyName } from '../../projects/assets/useFontAssetFamily'
import { useProjectContext } from '../../projects/ProjectContext'
import { renderBoardImageDataUrl } from '../../game/exportBoardImage'
import {
    resolveBoardExportBorderRadius,
    resolveExportCanvasBackground,
} from '../../game/boardAppearance'
import { useGameContext } from '../../game/context'

const PREVIEW_MAX_WIDTH = 220

export interface ProjectPreviewBridgeProps {
    boardRef: RefObject<SVGSVGElement | null>
}

export function ProjectPreviewBridge({ boardRef }: ProjectPreviewBridgeProps) {
    const { registerPreviewCapture } = useProjectContext()
    const { state } = useGameContext()
    const { getAssetById, getAssetUrl } = useAssetsContext()

    useEffect(() => {
        registerPreviewCapture(async () => {
            const svg = boardRef.current

            if (!svg) {
                return null
            }

            return renderBoardImageDataUrl(svg, {
                maxWidth: PREVIEW_MAX_WIDTH,
                scale: 1,
                mimeType: 'image/jpeg',
                quality: 0.82,
                background: resolveExportCanvasBackground(state.boardParameters, 'image/jpeg'),
                borderRadius: resolveBoardExportBorderRadius(state.boardParameters),
                getFontFaceForAsset: (assetId) => {
                    const asset = getAssetById(assetId)
                    const url = getAssetUrl(assetId)

                    if (!asset || !url) {
                        return undefined
                    }

                    return {
                        url,
                        format: getFontFormat(asset),
                        family: getFontFamilyName(assetId),
                    }
                },
            })
        })

        return () => registerPreviewCapture(null)
    }, [boardRef, registerPreviewCapture, getAssetById, getAssetUrl, state.boardParameters])

    return null
}
