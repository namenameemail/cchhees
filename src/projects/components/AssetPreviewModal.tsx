import React, { FC, Suspense, useCallback, useEffect, useMemo } from 'react'
import cn from 'classnames'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { isFontAsset, isModelAsset } from '../assets/assetKinds'
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

function GltfObject({ url }: { url: string }) {
    const { scene } = useGLTF(url)

    const object = useMemo(() => {
        const clone = scene.clone(true)
        const box = new Box3().setFromObject(clone)
        const center = box.getCenter(new Vector3())
        const size = box.getSize(new Vector3())
        const maxDim = Math.max(size.x, size.y, size.z, 0.001)
        clone.position.sub(center)
        clone.scale.setScalar(1 / maxDim)
        return clone
    }, [scene])

    return <primitive object={object} />
}

function ModelPreview({ asset }: { asset: ProjectAssetView }) {
    return (
        <div className={styles.modelPreview}>
            <Canvas camera={{ position: [1.8, 0.9, 1.8], fov: 45 }}>
                <color attach="background" args={[0x888888]} />
                <ambientLight intensity={2.7} />
                <directionalLight position={[5, 8, 4]} intensity={7.5} />
                <Suspense fallback={null}>
                    <GltfObject url={asset.objectUrl} />
                </Suspense>
                <OrbitControls />
            </Canvas>
        </div>
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
    const isModel = isModelAsset(asset)

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
                    ) : isModel ? (
                        <ModelPreview key={asset.id} asset={asset} />
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
