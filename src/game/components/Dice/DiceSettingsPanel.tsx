import { FC, useEffect, useState } from 'react'
import cn from 'classnames'
import { getModelThumbnail } from '../../../projects/assets/renderModelThumbnail'
import { useAssetsContext } from '../../../projects/assets/AssetsContext'
import { useDiceContext, DicePanelState } from './DiceContext'
import styles from './DicePanel.module.css'

const BASE = import.meta.env.BASE_URL

const BUILTIN_MODELS = [
    { path: `${BASE}bubblecubik_export2.1.glb`, label: 'bubble' },
    { path: `${BASE}cube_bone_s.glb`, label: 'bone' },
    { path: `${BASE}pyra_one2.glb`, label: 'pyra' },
    { path: `${BASE}cube_crys2_bake.glb`, label: 'crystal' },
    { path: `${BASE}cube_stone (1).glb`, label: 'stone' },
]

function ModelThumb({ url }: { url: string }) {
    const [src, setSrc] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getModelThumbnail(url)
            .then(dataUrl => { if (!cancelled) setSrc(dataUrl) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [url])

    if (!src) return <span className={styles.modelThumbnailPlaceholder}>3D</span>
    return <img src={src} className={styles.modelThumbnail} alt="" />
}

function DiceModelPicker({ state, onChange }: { state: DicePanelState; onChange: (next: DicePanelState) => void }) {
    const { assets, isModelAsset } = useAssetsContext()
    const assetModels = assets.filter(isModelAsset)

    const selectBuiltin = (path: string) => onChange({
        ...state,
        builtinModelPath: state.builtinModelPath === path ? null : path,
        modelAssetId: null,
    })

    const selectAsset = (id: number) => onChange({
        ...state,
        modelAssetId: state.modelAssetId === id ? null : id,
        builtinModelPath: null,
    })

    return (
        <div className={styles.modelPicker}>
            <div className={styles.modelRow}>
                {BUILTIN_MODELS.map(m => (
                    <div
                        key={m.path}
                        className={cn(styles.modelOption, state.builtinModelPath === m.path && styles.modelOptionSelected)}
                        onClick={() => selectBuiltin(m.path)}
                        title={m.label}
                    >
                        <ModelThumb url={m.path} />
                    </div>
                ))}
            </div>
            {assetModels.length > 0 && (
                <>
                    <div className={styles.modelSectionLabel}>из ассетов</div>
                    <div className={styles.modelRow}>
                        {assetModels.map(asset => (
                            <div
                                key={asset.id}
                                className={cn(styles.modelOption, state.modelAssetId === asset.id && styles.modelOptionSelected)}
                                onClick={() => selectAsset(asset.id)}
                                title={asset.name}
                            >
                                <ModelThumb url={asset.objectUrl} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export const DiceSettingsPanel: FC = () => {
    const { state, handleChange } = useDiceContext()

    return (
        <div className={styles.controls}>
            <DiceModelPicker state={state} onChange={handleChange} />
        </div>
    )
}
