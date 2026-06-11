import React, { FC, useCallback, useRef } from 'react'
import { useAssetsContext } from '../assets/AssetsContext'
import { useGameContext } from '../../game/context'
import { countAssetReferences } from '../assets/assetReferences'
import { FONT_UPLOAD_ACCEPT, IMAGE_UPLOAD_ACCEPT } from '../assets/assetKinds'
import { getFontFamilyName, useFontAssetFamily } from '../assets/useFontAssetFamily'
import { formatBytes } from '../formatBytes'
import { ProjectAssetView } from '../assets/types'
import styles from './AssetsPanel.module.css'

function FontAssetThumbnail({ asset }: { asset: ProjectAssetView }) {
    const fontFamily = useFontAssetFamily(asset.id)

    return (
        <div
            className={styles.fontThumbnail}
            style={fontFamily ? { fontFamily } : undefined}
        >
            Aa
        </div>
    )
}

function AssetThumbnail({ asset, isFontAsset }: { asset: ProjectAssetView; isFontAsset: boolean }) {
    if (isFontAsset) {
        return <FontAssetThumbnail asset={asset} />
    }

    return (
        <img
            className={styles.thumbnail}
            src={asset.objectUrl}
            alt={asset.name}
        />
    )
}

export const AssetsPanel: FC = () => {
    const { assets, isLoading, addAsset, removeAsset, isFontAsset } = useAssetsContext()
    const { state, clearAssetReferences } = useGameContext()
    const imageInputRef = useRef<HTMLInputElement>(null)
    const fontInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files) {
            return
        }

        for (const file of Array.from(files)) {
            await addAsset(file)
        }

        event.target.value = ''
    }, [addAsset])

    const handleDelete = useCallback(async (assetId: number, assetName: string) => {
        const referenceCount = countAssetReferences(state, assetId)

        if (referenceCount > 0) {
            const confirmed = window.confirm(
                `Asset "${assetName}" is used in ${referenceCount} place(s). Remove it and clear those references?`,
            )
            if (!confirmed) {
                return
            }
            clearAssetReferences(assetId)
        }

        await removeAsset(assetId)
    }, [state, clearAssetReferences, removeAsset])

    return (
        <div className={styles.assetsPanel}>
            <div className={styles.header}>
                <div className={styles.title}>Assets</div>
                <div className={styles.uploadButtons}>
                    <label className={styles.uploadLabel}>
                        images
                        <input
                            ref={imageInputRef}
                            className={styles.uploadInput}
                            type="file"
                            accept={IMAGE_UPLOAD_ACCEPT}
                            multiple
                            onChange={handleUpload}
                        />
                    </label>
                    <label className={styles.uploadLabel}>
                        fonts
                        <input
                            ref={fontInputRef}
                            className={styles.uploadInput}
                            type="file"
                            accept={FONT_UPLOAD_ACCEPT}
                            multiple
                            onChange={handleUpload}
                        />
                    </label>
                </div>
            </div>

            {isLoading ? (
                <div className={styles.empty}>Loading...</div>
            ) : assets.length === 0 ? (
                <div className={styles.empty}>No assets yet. Upload images or fonts.</div>
            ) : (
                <div className={styles.list}>
                    {[...assets].reverse().map(asset => (
                        <div className={styles.item} key={asset.id}>
                            <AssetThumbnail
                                asset={asset}
                                isFontAsset={isFontAsset(asset)}
                            />
                            <div className={styles.meta}>
                                <div className={styles.name}>{asset.name}</div>
                                <div className={styles.details}>
                                    {asset.mimeType} · {formatBytes(asset.size)}
                                    {isFontAsset(asset) ? ` · ${getFontFamilyName(asset.id)}` : ''}
                                </div>
                            </div>
                            <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={() => void handleDelete(asset.id, asset.name)}
                            >
                                delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
