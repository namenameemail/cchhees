import { useMemo } from 'react'
import { FontSelect, FontSelectProps } from '../../components/FontSelect/FontSelect'
import { useAssetsContext } from '../assets/AssetsContext'

export type ProjectFontSelectProps = Omit<FontSelectProps, 'assets'>

export function ProjectFontSelect(props: ProjectFontSelectProps) {
    const { assets, isFontAsset } = useAssetsContext()

    const fontAssets = useMemo(() => {
        return assets.filter(isFontAsset)
    }, [assets, isFontAsset])

    return (
        <FontSelect
            {...props}
            assets={fontAssets}
        />
    )
}
