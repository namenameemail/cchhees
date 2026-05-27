import React, { FC, useCallback, useRef } from 'react'
import { useAssetsContext } from '../assets/AssetsContext'
import { useGameContext } from '../../game/context'
import { countAssetReferences } from '../assets/assetReferences'
import styles from './AssetsPanel.module.css'

function formatSize(size: number): string {
    if (size < 1024) {
        return `${size} B`
    }
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export const AssetsPanel: FC = () => {
    const { assets, isLoading, addAsset, removeAsset } = useAssetsContext()
    const { state, clearAssetReferences } = useGameContext()
    const inputRef = useRef<HTMLInputElement>(null)

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
                <label className={styles.uploadLabel}>
                    Upload
                    <input
                        ref={inputRef}
                        className={styles.uploadInput}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUpload}
                    />
                </label>
            </div>

            {isLoading ? (
                <div className={styles.empty}>Loading...</div>
            ) : assets.length === 0 ? (
                <div className={styles.empty}>No assets yet. Upload images to use them in cell settings.</div>
            ) : (
                <div className={styles.list}>
                    {[...assets].reverse().map(asset => (
                        <div className={styles.item} key={asset.id}>
                            <img
                                className={styles.thumbnail}
                                src={asset.objectUrl}
                                alt={asset.name}
                            />
                            <div className={styles.meta}>
                                <div className={styles.name}>{asset.name}</div>
                                <div className={styles.details}>
                                    {asset.mimeType} · {formatSize(asset.size)}
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
