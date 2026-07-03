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
    iconMode?: boolean
    className?: string
}

export const BoardExportButton: FC<BoardExportButtonProps> = ({ boardRef, iconMode, className }) => {
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
                className={className ?? (iconMode ? undefined : styles.boardExportButton)}
                onClick={() => void handleExport()}
                disabled={isExporting}
                title={isExporting ? 'экспорт...' : 'export png'}
            >
                {iconMode ? (
                    <>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3 }}>
                            <path d="M6.5 1v7M3.5 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="1.5" y1="11.5" x2="11.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        PNG
                    </>
                ) : (isExporting ? 'export...' : 'export png')}
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
