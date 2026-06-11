import React, { FC, RefObject, useCallback, useState } from 'react'
import { getFontFormat } from '../../projects/assets/assetKinds'
import { useAssetsContext } from '../../projects/assets/AssetsContext'
import { getFontFamilyName } from '../../projects/assets/useFontAssetFamily'
import { useProjectContext } from '../../projects/ProjectContext'
import { createBoardImageFilename, exportBoardAsPng } from '../exportBoardImage'
import styles from '../styles.module.css'

export interface BoardExportButtonProps {
    boardRef: RefObject<SVGSVGElement | null>
}

export const BoardExportButton: FC<BoardExportButtonProps> = ({ boardRef }) => {
    const { currentProject } = useProjectContext()
    const { getAssetById, getAssetUrl } = useAssetsContext()
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = useCallback(async () => {
        const svg = boardRef.current
        if (!svg) {
            return
        }

        setIsExporting(true)

        try {
            await exportBoardAsPng(svg, {
                filename: createBoardImageFilename(currentProject?.name ?? 'board'),
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
            window.alert('Не удалось экспортировать доску как картинку')
        } finally {
            setIsExporting(false)
        }
    }, [boardRef, currentProject?.name, getAssetById, getAssetUrl])

    return (
        <button
            type="button"
            className={styles.boardExportButton}
            onClick={() => void handleExport()}
            disabled={isExporting}
        >
            {isExporting ? 'export...' : 'export png'}
        </button>
    )
}
