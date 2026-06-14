import React, { FC, RefObject, useCallback, useState } from 'react'
import { ConfirmModal } from '../../components/ConfirmModal'
import { getFontFormat } from '../../projects/assets/assetKinds'
import { useAssetsContext } from '../../projects/assets/AssetsContext'
import { getFontFamilyName } from '../../projects/assets/useFontAssetFamily'
import { useProjectContext } from '../../projects/ProjectContext'
import { createBoardImageFilename, exportBoardAsPng } from '../exportBoardImage'
import {
    resolveAxisNumberingFrameAppearance,
    resolveBoardAppearance,
    resolveBoardExportBorderRadius,
    resolveExportCanvasBackground,
    shouldClipAxisNumberingToFrame,
} from '../boardAppearance'
import { exportDebugLog } from '../exportDebugLog'
import { useGameContext } from '../context'
import styles from '../styles.module.css'

export interface BoardExportButtonProps {
    boardRef: RefObject<SVGSVGElement | null>
}

export const BoardExportButton: FC<BoardExportButtonProps> = ({ boardRef }) => {
    const { currentProject } = useProjectContext()
    const { state } = useGameContext()
    const { getAssetById, getAssetUrl } = useAssetsContext()
    const [isExporting, setIsExporting] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)

    const handleExport = useCallback(async () => {
        const svg = boardRef.current
        if (!svg) {
            return
        }

        setIsExporting(true)

        const { boardParameters } = state
        const boardAppearance = resolveBoardAppearance(boardParameters)
        const frameAppearance = resolveAxisNumberingFrameAppearance(boardParameters)
        const borderRadius = resolveBoardExportBorderRadius(boardParameters)
        const canvasBackground = resolveExportCanvasBackground(boardParameters, 'image/png')

        exportDebugLog.params({
            boardBg: boardAppearance.background,
            frameBg: frameAppearance.background,
            frameRadius: frameAppearance.borderRadius,
            clipEnabled: shouldClipAxisNumberingToFrame(boardParameters),
            resolvedBorderRadius: borderRadius,
            canvasBackground,
            shouldFill: canvasBackground !== 'transparent',
            source: 'BoardExportButton',
        })

        try {
            await exportBoardAsPng(svg, {
                filename: createBoardImageFilename(currentProject?.name ?? 'board'),
                background: canvasBackground,
                borderRadius,
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
        } catch (error) {
            console.error('[BoardExportButton] export failed:', error)
            setExportError('Не удалось экспортировать доску как картинку')
        } finally {
            setIsExporting(false)
        }
    }, [boardRef, currentProject?.name, getAssetById, getAssetUrl, state.boardParameters])

    return (
        <>
            <button
                type="button"
                className={styles.boardExportButton}
                onClick={() => void handleExport()}
                disabled={isExporting}
            >
                {isExporting ? 'export...' : 'export png'}
            </button>

            <ConfirmModal
                open={exportError !== null}
                title="Ошибка экспорта"
                message={exportError ?? ''}
                alert
                onConfirm={() => setExportError(null)}
            />
        </>
    )
}
