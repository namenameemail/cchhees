import styles from './ImageSelect.module.css'
import cn from 'classnames'
import { BlurEnterTextInput } from 'bbuutoonnss'
import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { ProjectAssetView } from '../../projects/assets/types'

export interface ImageSelectProps {
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

export function ImageSelect(props: ImageSelectProps) {
    const {
        className,
        onChange,
        value,
        name,
        placeholder,
        title,
        assets,
        clearable = false,
        clearTitle = 'Сбросить изображение',
    } = props

    const [focused, setFocused] = useState(false)
    const [listFocused, setListFocused] = useState(false)

    const selectedAsset = useMemo(() => {
        if (value == null) {
            return undefined
        }
        return assets.find(asset => asset.id === value)
    }, [assets, value])

    const handleImageSelect = useCallback((assetId: number) => {
        onChange?.(assetId, name)
        setFocused(false)
        setListFocused(false)
    }, [onChange, name])

    const handleImageMouseDown = useCallback((event: MouseEvent, assetId: number) => {
        event.preventDefault()
        handleImageSelect(assetId)
    }, [handleImageSelect])

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
                <div className={styles.images}>
                    {assets.length === 0 ? (
                        <div className={styles.empty}>No assets</div>
                    ) : (
                        assets.map(asset => (
                            <div
                                className={styles.image}
                                key={asset.id}
                                onMouseDown={(event) => handleImageMouseDown(event, asset.id)}
                            >
                                <img
                                    className={styles.thumbnail}
                                    src={asset.objectUrl}
                                    alt={asset.name}
                                    width={30}
                                    height={30}
                                />
                                <div className={styles.name}>{asset.name}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
