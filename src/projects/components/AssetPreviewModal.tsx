import React, { FC, useCallback, useEffect } from 'react'
import { isFontAsset } from '../assets/assetKinds'
import { useFontAssetFamily } from '../assets/useFontAssetFamily'
import { formatBytes } from '../formatBytes'
import { ProjectAssetView } from '../assets/types'
import styles from './AssetPreviewModal.module.css'

const FONT_PREVIEW_TEXT = `The quick brown fox jumps over the lazy dog.
0123456789 !?@#$%

Съешь же ещё этих мягких французских булок, да выпей чаю.`

export interface AssetPreviewModalProps {
    asset: ProjectAssetView | null
    onClose: () => void
}

function FontPreview({ asset }: { asset: ProjectAssetView }) {
    const fontFamily = useFontAssetFamily(asset.id)

    return (
        <textarea
            className={styles.fontPreview}
            defaultValue={FONT_PREVIEW_TEXT}
            style={fontFamily ? { fontFamily } : undefined}
        />
    )
}

export const AssetPreviewModal: FC<AssetPreviewModalProps> = ({ asset, onClose }) => {
    const handleOverlayClick = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }, [onClose])

    useEffect(() => {
        if (!asset) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [asset, onClose])

    if (!asset) {
        return null
    }

    const isFont = isFontAsset(asset)

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="asset-preview-title"
            >
                <h2 className={styles.title} id="asset-preview-title">{asset.name}</h2>
                <div className={styles.meta}>
                    {asset.mimeType} · {formatBytes(asset.size)}
                </div>
                <div className={styles.content}>
                    {isFont ? (
                        <FontPreview asset={asset} />
                    ) : (
                        <img
                            className={styles.previewImage}
                            src={asset.objectUrl}
                            alt={asset.name}
                        />
                    )}
                </div>
                <div className={styles.actions}>
                    <button type="button" onClick={onClose}>
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    )
}
