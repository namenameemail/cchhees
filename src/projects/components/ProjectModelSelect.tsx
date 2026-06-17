import { useMemo } from 'react'
import { ModelSelect, ModelSelectProps } from '../../components/ModelSelect/ModelSelect'
import { useAssetsContext } from '../assets/AssetsContext'

export function ProjectModelSelect(props: Omit<ModelSelectProps, 'assets'>) {
    const { assets, isModelAsset } = useAssetsContext()

    const filteredAssets = useMemo(
        () => assets.filter(isModelAsset),
        [assets, isModelAsset],
    )

    return (
        <ModelSelect
            {...props}
            assets={filteredAssets}
        />
    )
}
