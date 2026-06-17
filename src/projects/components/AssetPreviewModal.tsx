import React, { FC, useCallback, useEffect } from 'react'
import cn from 'classnames'
import { isFontAsset } from '../assets/assetKinds'
import { useFontAssetFamily } from '../assets/useFontAssetFamily'
import { ProjectAssetView } from '../assets/types'
import styles from './AssetPreviewModal.module.css'

const FONT_PREVIEW_TEXT = `The quick brown fox jumps over the lazy dog.
0123456789 !?@#$%

Съешь же ещё этих мягких французских булок, да выпей чаю.`

export interface AssetPreviewModalProps {
    asset: ProjectAssetView | null
    assets: ProjectAssetView[]
    onSelectAsset: (asset: ProjectAssetView) => void
    onClose: () => void
}

function FontPreview({ asset }: { asset: ProjectAssetView }) {
    const fontFamily = useFontAssetFamily(asset.id)

    return (
        <textarea
            key={asset.id}
            className={styles.fontPreview}
            defaultValue={FONT_PREVIEW_TEXT}
            style={fontFamily ? { fontFamily } : undefined}
        />
    )
}

export const AssetPreviewModal: FC<AssetPreviewModalProps> = ({
    asset,
    assets,
    onSelectAsset,
    onClose,
}) => {
    const assetIndex = asset ? assets.findIndex(item => item.id === asset.id) : -1
    const hasPrevious = assetIndex > 0
    const hasNext = assetIndex >= 0 && assetIndex < assets.length - 1

    const showPrevious = useCallback(() => {
        if (!hasPrevious) {
            return
        }

        onSelectAsset(assets[assetIndex - 1])
    }, [assetIndex, assets, hasPrevious, onSelectAsset])

    const showNext = useCallback(() => {
        if (!hasNext) {
            return
        }

        onSelectAsset(assets[assetIndex + 1])
    }, [assetIndex, assets, hasNext, onSelectAsset])

    const handleOverlayClick = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }, [onClose])

    const handleModalClick = useCallback((event: React.MouseEvent) => {
        event.stopPropagation()
    }, [])

    useEffect(() => {
        if (!asset) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
                return
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault()
                showPrevious()
                return
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault()
                showNext()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [asset, onClose, showNext, showPrevious])

    if (!asset || assetIndex < 0) {
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
                onClick={handleModalClick}
            >
                <div className={styles.content}>
                    <button
                        type="button"
                        className={cn(styles.navButton, styles.navButtonPrev)}
                        onClick={showPrevious}
                        disabled={!hasPrevious}
                        aria-label="Предыдущий ассет"
                    >
                        ‹
                    </button>
                    {isFont ? (
                        <FontPreview asset={asset} />
                    ) : (
                        <img
                            key={asset.id}
                            className={styles.previewImage}
                            src={asset.objectUrl}
                            alt={asset.name}
                        />
                    )}
                    <button
                        type="button"
                        className={cn(styles.navButton, styles.navButtonNext)}
                        onClick={showNext}
                        disabled={!hasNext}
                        aria-label="Следующий ассет"
                    >
                        ›
                    </button>
                </div>
                <footer className={styles.footer}>
                    <div className={styles.footerInfo}>
                        <h2 className={styles.title} id="asset-preview-title">{asset.name}</h2>
                        <div className={styles.meta}>{asset.mimeType}</div>
                    </div>
                    <div className={styles.footerActions}>
                        <button type="button" onClick={onClose}>
                            Закрыть
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )
}
