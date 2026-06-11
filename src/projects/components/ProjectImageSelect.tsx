import { useMemo } from 'react'
import { ImageSelect, ImageSelectProps } from '../../components/ImageSelect/ImageSelect'
import { useAssetsContext } from '../assets/AssetsContext'

export function ProjectImageSelect(props: Omit<ImageSelectProps, 'assets'>) {
    const { assets, isImageAsset } = useAssetsContext()

    const filteredAssets = useMemo(
        () => assets.filter(isImageAsset),
        [assets, isImageAsset],
    )

    return (
        <ImageSelect
            {...props}
            assets={filteredAssets}
        />
    )
}
