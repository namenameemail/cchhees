import { useMemo } from 'react'
import { ImageSelect, ImageSelectProps } from '../../components/ImageSelect/ImageSelect'
import { useAssetsContext } from '../assets/AssetsContext'

export interface ProjectImageSelectProps extends Omit<ImageSelectProps, 'assets'> {
    svgOnly?: boolean
}

export function ProjectImageSelect(props: ProjectImageSelectProps) {
    const { svgOnly = false, ...rest } = props
    const { assets, isSvgAsset } = useAssetsContext()

    const filteredAssets = useMemo(() => {
        if (!svgOnly) {
            return assets
        }
        return assets.filter(isSvgAsset)
    }, [assets, isSvgAsset, svgOnly])

    return (
        <ImageSelect
            {...rest}
            assets={filteredAssets}
        />
    )
}
