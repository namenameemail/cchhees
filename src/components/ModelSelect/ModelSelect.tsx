import styles from '../ImageSelect/ImageSelect.module.css'
import cn from 'classnames'
import { BlurEnterTextInput } from 'bbuutoonnss'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ProjectAssetView } from '../../projects/assets/types'

export interface ModelSelectProps {
    className?: string
    name?: string
    value: number | null
    assets: ProjectAssetView[]
    placeholder?: string
    title?: string
    clearable?: boolean
    clearTitle?: string
    onChange?: (assetId: number | null, name?: string) => void
}

export function ModelSelect(props: ModelSelectProps) {
    const {
        className,
        onChange,
        value,
        name,
        placeholder,
        title,
        assets,
        clearable = false,
        clearTitle = 'Сбросить модель',
    } = props

    const [focused, setFocused] = useState(false)
    const [listFocused, setListFocused] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)
    const isOpen = focused || listFocused

    useEffect(() => {
        if (!isOpen || value == null || !listRef.current) {
            return
        }

        listRef.current
            .querySelector<HTMLElement>(`[data-asset-id="${value}"]`)
            ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [isOpen, value, assets])

    const selectedAsset = useMemo(() => {
        if (value == null) {
            return undefined
        }
        return assets.find(asset => asset.id === value)
    }, [assets, value])

    const handleModelSelect = useCallback((assetId: number) => {
        onChange?.(assetId === value ? null : assetId, name)
        setFocused(false)
        setListFocused(false)
    }, [onChange, name, value])

    const handleModelMouseDown = useCallback((event: MouseEvent, assetId: number) => {
        event.preventDefault()
        handleModelSelect(assetId)
    }, [handleModelSelect])

    const handleFocus = useCallback(() => {
        setFocused(true)
    }, [])

    const handleBlur = useCallback(() => {
        setFocused(false)
    }, [])

    const handleEnter = useCallback(() => {
        setListFocused(true)
    }, [])

    const handleLeave = useCallback(() => {
        setListFocused(false)
    }, [])

    const handleClearMouseDown = useCallback((event: MouseEvent) => {
        event.preventDefault()
        onChange?.(null, name)
        setFocused(false)
        setListFocused(false)
    }, [onChange, name])

    const showClear = clearable && value != null

    return (
        <div
            className={cn(styles.imageSelect, className)}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            <div className={styles.inputRow}>
                <BlurEnterTextInput
                    value={selectedAsset?.name || ''}
                    resetOnBlur
                    readOnly
                    onChange={() => {}}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    title={title}
                    className={showClear ? styles.inputWithClear : undefined}
                />
                {showClear && (
                    <button
                        type="button"
                        className={styles.clearButton}
                        title={clearTitle}
                        aria-label={clearTitle}
                        onMouseDown={handleClearMouseDown}
                    >
                        ×
                    </button>
                )}
            </div>
            {(focused || listFocused) && (
                <div className={styles.images} ref={listRef}>
                    {assets.length === 0 ? (
                        <div className={styles.empty}>No GLB assets</div>
                    ) : (
                        assets.map(asset => (
                            <div
                                className={cn(
                                    styles.image,
                                    asset.id === value && styles.imageSelected,
                                )}
                                key={asset.id}
                                data-asset-id={asset.id}
                                onMouseDown={(event) => handleModelMouseDown(event, asset.id)}
                            >
                                <div className={styles.modelThumbnail}>3D</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
