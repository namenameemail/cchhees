import React, { FC } from 'react'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import { BoardBackgroundImageFit, BoardAxisNumberingFrameSettings, BoardSurfaceAppearance } from '../../types/boardParameters'
import { Form1FieldConfig } from '../../../components/Form1/types'
import styles from './styles.module.css'

const BackgroundAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const hasAsset = typeof value === 'number'

    return (
        <div className={styles.fullWidth}>
            <div className={styles.backgroundAssetField}>
                <ProjectImageSelect
                    name={name}
                    value={hasAsset ? value : null}
                    placeholder="background image"
                    title="background image"
                    onChange={(assetId) => onChange(name, assetId)}
                />
                {hasAsset && (
                    <button
                        type="button"
                        className={styles.clearBackgroundImage}
                        title="Сбросить изображение"
                        onClick={() => onChange(name, null)}
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    )
}

export function createSurfaceAppearanceFormConfig(
    value: BoardSurfaceAppearance,
): Form1FieldConfig<BoardSurfaceAppearance>[] {
    const hasBackgroundImage = value.backgroundAssetId != null
    const imageFit = value.backgroundImageFit ?? BoardBackgroundImageFit.tile

    return [
        {
            name: 'background',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'background', className: styles.fullWidth },
        },
        {
            name: 'backgroundAssetId',
            Component: BackgroundAssetSelectField,
        },
        {
            name: 'backgroundImageFit',
            type: ParameterTypes.SelectArray,
            visibility: () => hasBackgroundImage,
            props: {
                className: styles.fullWidth,
                title: 'image fit',
                options: Object.values(BoardBackgroundImageFit),
            },
        },
        {
            name: 'backgroundRepeatWidth',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat width', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatHeight',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat height', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatOffsetX',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat offsetX' },
        },
        {
            name: 'backgroundRepeatOffsetY',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat offsetY' },
        },
        {
            name: 'borderRadius',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'borderRadius', ...nonNegative },
        },
        {
            name: 'borderWidth',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'borderWidth', ...nonNegative },
        },
        {
            name: 'borderColor',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'borderColor', className: styles.fullWidth },
        },
        {
            name: 'borderDasharray',
            type: ParameterTypes.TextInput,
            props: { placeholder: 'borderDasharray' },
        },
    ]
}

const ClipNumberingSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange, props }) => {
    const checked = value === true

    return (
        <div className={props?.className}>
            <select
                className={styles.axisSideSelect}
                value={checked ? 'clip' : 'none'}
                title="обрезка по скруглению"
                onChange={event => onChange(name, event.target.value === 'clip')}
            >
                <option value="none">не обрезать</option>
                <option value="clip">обрезать по скруглению</option>
            </select>
        </div>
    )
}

export function createAxisNumberingFrameFormConfig(
    value: BoardAxisNumberingFrameSettings,
): Form1FieldConfig<BoardAxisNumberingFrameSettings>[] {
    const hasBorderRadius = (value.borderRadius ?? 0) > 0

    return [
        ...createSurfaceAppearanceFormConfig(value),
        {
            name: 'clipNumberingToBorderRadius',
            Component: ClipNumberingSelectField,
            visibility: () => hasBorderRadius,
            props: { className: styles.fullWidth },
        },
    ]
}
