import styles from './FontSelect.module.css'
import cn from 'classnames'
import { BlurEnterTextInput } from '../inputs/BlurEnterTextInput/BlurEnterTextInput'
import { useCallback, useMemo, useState } from 'react'
import { ProjectAssetView } from '../../projects/assets/types'
import { useFontAssetFamily } from '../../projects/assets/useFontAssetFamily'

export interface FontSelectProps {
    className?: string
    name?: string
    value: number | null
    assets: ProjectAssetView[]
    placeholder?: string
    title?: string
    onChange?: (assetId: number | null, name?: string) => void
}

function FontPreview({ asset }: { asset: ProjectAssetView }) {
    const fontFamily = useFontAssetFamily(asset.id)

    return (
        <div
            className={styles.preview}
            style={fontFamily ? { fontFamily } : undefined}
        >
            Aa
        </div>
    )
}

export function FontSelect(props: FontSelectProps) {
    const { className, onChange, value, name, placeholder, title, assets } = props

    const [focused, setFocused] = useState(false)
    const [listFocused, setListFocused] = useState(false)

    const selectedAsset = useMemo(() => {
        if (value == null) {
            return undefined
        }
        return assets.find(asset => asset.id === value)
    }, [assets, value])

    const handleFontClick = useCallback((assetId: number) => {
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

    useFontAssetFamily(selectedAsset?.id)

    return (
        <div
            className={cn(styles.fontSelect, className)}
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
                        <div className={styles.empty}>No fonts</div>
                    ) : (
                        assets.map(asset => (
                            <div
                                className={styles.fontItem}
                                key={asset.id}
                                onClick={() => handleFontClick(asset.id)}
                            >
                                <FontPreview asset={asset} />
                                <div className={styles.name}>{asset.name}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
