import styles from './ImageSelect.module.css'
import cn from 'classnames'
import { BlurEnterTextInput } from '../inputs/BlurEnterTextInput/BlurEnterTextInput'
import { useCallback, useMemo, useState } from 'react'
import { ProjectAssetView } from '../../projects/assets/types'

export interface ImageSelectProps {
    className?: string
    name?: string
    value: number | null
    assets: ProjectAssetView[]
    placeholder?: string
    title?: string
    onChange?: (assetId: number | null, name?: string) => void
}

export function ImageSelect(props: ImageSelectProps) {
    const { className, onChange, value, name, placeholder, title, assets } = props

    const [focused, setFocused] = useState(false)
    const [listFocused, setListFocused] = useState(false)

    const selectedAsset = useMemo(() => {
        if (value == null) {
            return undefined
        }
        return assets.find(asset => asset.id === value)
    }, [assets, value])

    const handleImageClick = useCallback((assetId: number) => {
        onChange?.(assetId, name)
    }, [onChange, name])

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

    return (
        <div
            className={cn(styles.imageSelect, className)}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            <BlurEnterTextInput
                value={selectedAsset?.name || ''}
                changeOnEnter
                resetOnBlur
                onChange={() => onChange?.(null, name)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                title={title}
            />
            {(focused || listFocused) && (
                <div className={styles.images}>
                    {assets.length === 0 ? (
                        <div className={styles.empty}>No assets</div>
                    ) : (
                        assets.map(asset => (
                            <div
                                className={styles.image}
                                key={asset.id}
                                onClick={() => handleImageClick(asset.id)}
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
