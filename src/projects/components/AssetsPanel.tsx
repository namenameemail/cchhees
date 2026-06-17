import React, {
    DragEvent,
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import cn from 'classnames'
import { ConfirmModal } from '../../components/ConfirmModal'
import { AssetPreviewModal } from './AssetPreviewModal'
import { useAssetsContext } from '../assets/AssetsContext'
import { useGameContext } from '../../game/context'
import { countAssetReferences } from '../assets/assetReferences'
import {
    collectAllowedAssetFiles,
    collectAssetFilesFromClipboard,
    collectAssetFilesFromDataTransfer,
    ASSET_UPLOAD_ACCEPT,
} from '../assets/assetKinds'
import { useFontAssetFamily } from '../assets/useFontAssetFamily'
import { ProjectAssetView } from '../assets/types'
import styles from './AssetsPanel.module.css'

const DELETE_HOLD_MS = 1000

interface PendingAssetDelete {
    assetId: number
    assetName: string
    referenceCount: number
}

interface AssetCardProps {
    asset: ProjectAssetView
    isFont: boolean
    isModel: boolean
    onDeleteRequest: (assetId: number, assetName: string) => void
    onPreview: (asset: ProjectAssetView) => void
}

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

function ModelAssetThumbnail() {
    return (
        <div className={styles.modelThumbnail}>
            3D
        </div>
    )
}

function AssetThumbnail({
    asset,
    isFontAsset,
    isModelAsset,
}: {
    asset: ProjectAssetView
    isFontAsset: boolean
    isModelAsset: boolean
}) {
    if (isFontAsset) {
        return <FontAssetThumbnail asset={asset} />
    }

    if (isModelAsset) {
        return <ModelAssetThumbnail />
    }

    return (
        <img
            className={styles.thumbnail}
            src={asset.objectUrl}
            alt=""
        />
    )
}

function AssetCard({ asset, isFont, isModel, onDeleteRequest, onPreview }: AssetCardProps) {
    const [isHolding, setIsHolding] = useState(false)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearHold = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsHolding(false)
    }, [])

    const handleDeletePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsHolding(true)
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            setIsHolding(false)
            onDeleteRequest(asset.id, asset.name)
        }, DELETE_HOLD_MS)
    }, [asset.id, asset.name, onDeleteRequest])

    const handleDeletePointerEnd = useCallback(() => {
        clearHold()
    }, [clearHold])

    useEffect(() => () => clearHold(), [clearHold])

    const handleOpenPreview = useCallback(() => {
        onPreview(asset)
    }, [asset, onPreview])

    return (
        <div
            className={cn(styles.item, isHolding && styles.itemHoldDeleting)}
            title={asset.name}
            onClick={handleOpenPreview}
        >
            <button
                type="button"
                className={styles.deleteButton}
                aria-label={`Удалить ${asset.name}`}
                onClick={event => event.stopPropagation()}
                onPointerDown={handleDeletePointerDown}
                onPointerUp={handleDeletePointerEnd}
                onPointerCancel={handleDeletePointerEnd}
                onLostPointerCapture={handleDeletePointerEnd}
            >
                ×
            </button>
            <div className={styles.thumbnailWrap}>
                <AssetThumbnail asset={asset} isFontAsset={isFont} isModelAsset={isModel} />
            </div>
        </div>
    )
}

export const AssetsPanel: FC = () => {
    const { assets, isLoading, addAsset, removeAsset, isFontAsset, isModelAsset } = useAssetsContext()
    const { state, clearAssetReferences } = useGameContext()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dragDepthRef = useRef(0)
    const isMouseOverRef = useRef(false)
    const [pendingDelete, setPendingDelete] = useState<PendingAssetDelete | null>(null)
    const [previewAsset, setPreviewAsset] = useState<ProjectAssetView | null>(null)
    const [isDragActive, setIsDragActive] = useState(false)

    const displayAssets = useMemo(() => [...assets].reverse(), [assets])

    const addFiles = useCallback(async (files: File[]) => {
        for (const file of files) {
            await addAsset(file)
        }
    }, [addAsset])

    const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files) {
            return
        }

        await addFiles(collectAllowedAssetFiles(files))
        event.target.value = ''
    }, [addFiles])

    const handleDragEnter = useCallback((event: DragEvent) => {
        event.preventDefault()
        dragDepthRef.current += 1
        setIsDragActive(true)
    }, [])

    const handleDragLeave = useCallback((event: DragEvent) => {
        event.preventDefault()
        dragDepthRef.current -= 1

        if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0
            setIsDragActive(false)
        }
    }, [])

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault()
    }, [])

    const handleDrop = useCallback((event: DragEvent) => {
        event.preventDefault()
        dragDepthRef.current = 0
        setIsDragActive(false)

        void addFiles(collectAssetFilesFromDataTransfer(event.dataTransfer))
    }, [addFiles])

    const handlePaste = useCallback((event: ClipboardEvent) => {
        if (!isMouseOverRef.current) {
            return
        }

        const files = collectAssetFilesFromClipboard(event.clipboardData)

        if (files.length === 0) {
            return
        }

        event.preventDefault()
        void addFiles(files)
    }, [addFiles])

    const handleMouseEnter = useCallback(() => {
        isMouseOverRef.current = true
    }, [])

    const handleMouseLeave = useCallback(() => {
        isMouseOverRef.current = false
    }, [])

    useEffect(() => {
        document.addEventListener('paste', handlePaste)
        return () => document.removeEventListener('paste', handlePaste)
    }, [handlePaste])

    const handlePreview = useCallback((asset: ProjectAssetView) => {
        setPreviewAsset(asset)
    }, [])

    const handleClosePreview = useCallback(() => {
        setPreviewAsset(null)
    }, [])

    const handleDeleteRequest = useCallback((assetId: number, assetName: string) => {
        const referenceCount = countAssetReferences(state, assetId)

        if (referenceCount > 0) {
            setPendingDelete({ assetId, assetName, referenceCount })
            return
        }

        void removeAsset(assetId)
    }, [state, removeAsset])

    const handleConfirmDelete = useCallback(async () => {
        if (!pendingDelete) {
            return
        }

        const { assetId, referenceCount } = pendingDelete
        setPendingDelete(null)

        if (referenceCount > 0) {
            clearAssetReferences(assetId)
        }

        await removeAsset(assetId)
    }, [pendingDelete, clearAssetReferences, removeAsset])

    const handleCancelDelete = useCallback(() => {
        setPendingDelete(null)
    }, [])

    const deleteMessage = pendingDelete
        ? pendingDelete.referenceCount === 1
            ? `Ассет «${pendingDelete.assetName}» используется в 1 месте. Удалить и очистить ссылку?`
            : `Ассет «${pendingDelete.assetName}» используется в ${pendingDelete.referenceCount} местах. Удалить и очистить ссылки?`
        : ''

    return (
        <>
            <div
                className={`${styles.assetsPanel} ${isDragActive ? styles.assetsPanelDragActive : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {isDragActive && (
                    <div className={styles.dropOverlay}>
                        Отпустите изображения, шрифты или GLB для добавления
                    </div>
                )}

                <div className={styles.header}>
                    <div className={styles.title}>Assets</div>
                    <div className={styles.uploadButtons}>
                        <label className={styles.uploadLabel}>
                            add
                            <input
                                ref={fileInputRef}
                                className={styles.uploadInput}
                                type="file"
                                accept={ASSET_UPLOAD_ACCEPT}
                                multiple
                                onChange={handleUpload}
                            />
                        </label>
                    </div>
                </div>

                <div className={styles.body}>
                    {isLoading ? (
                        <div className={styles.empty}>Loading...</div>
                    ) : assets.length === 0 ? (
                        <div className={styles.empty}>
                            No assets yet. Upload, drag & drop, or paste while hovering here.
                        </div>
                    ) : (
                        <div className={styles.list}>
                            {displayAssets.map(asset => (
                                <AssetCard
                                    key={asset.id}
                                    asset={asset}
                                    isFont={isFontAsset(asset)}
                                    isModel={isModelAsset(asset)}
                                    onDeleteRequest={handleDeleteRequest}
                                    onPreview={handlePreview}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AssetPreviewModal
                asset={previewAsset}
                assets={displayAssets}
                onSelectAsset={setPreviewAsset}
                onClose={handleClosePreview}
            />

            <ConfirmModal
                open={pendingDelete !== null}
                title="Удалить ассет"
                message={deleteMessage}
                confirmLabel="Удалить"
                destructive
                onConfirm={() => void handleConfirmDelete()}
                onCancel={handleCancelDelete}
            />
        </>
    )
}
