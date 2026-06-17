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
        <ProjectImageSelect
            name={name}
            value={hasAsset ? value : null}
            placeholder="background image"
            title="background image"
            clearable
            onChange={(assetId) => onChange(name, assetId)}
        />
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
            label: 'bg',
            type: ParameterTypes.ColorInput,
            props: { title: 'цвет фона', placeholder: 'background' },
        },
        {
            name: 'backgroundAssetId',
            label: 'img',
            Component: BackgroundAssetSelectField,
            props: { title: 'фоновое изображение' },
        },
        {
            name: 'backgroundImageFit',
            label: 'fit',
            type: ParameterTypes.SelectArray,
            visibility: () => hasBackgroundImage,
            props: {
                title: 'режим изображения',
                options: Object.values(BoardBackgroundImageFit),
            },
        },
        {
            name: 'backgroundRepeatWidth',
            label: 'rW',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'ширина повтора', placeholder: 'repeat width', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatHeight',
            label: 'rH',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'высота повтора', placeholder: 'repeat height', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatOffsetX',
            label: 'oX',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'смещение повтора X', placeholder: 'repeat offsetX' },
        },
        {
            name: 'backgroundRepeatOffsetY',
            label: 'oY',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'смещение повтора Y', placeholder: 'repeat offsetY' },
        },
        {
            name: 'borderRadius',
            label: 'br',
            type: ParameterTypes.NumberInput,
            props: { title: 'скругление рамки', placeholder: 'borderRadius', ...nonNegative },
        },
        {
            name: 'borderWidth',
            label: 'bw',
            type: ParameterTypes.NumberInput,
            props: { title: 'толщина рамки', placeholder: 'borderWidth', ...nonNegative },
        },
        {
            name: 'borderColor',
            label: 'bc',
            type: ParameterTypes.ColorInput,
            props: { title: 'цвет рамки', placeholder: 'borderColor' },
        },
        {
            name: 'borderDasharray',
            label: 'ds',
            type: ParameterTypes.TextInput,
            props: { title: 'штрих рамки (dasharray)', placeholder: 'borderDasharray' },
        },
    ]
}

const ClipNumberingSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const checked = value === true

    return (
        <select
            className={styles.axisSideSelect}
            value={checked ? 'clip' : 'none'}
            title="обрезка по скруглению"
            onChange={event => onChange(name, event.target.value === 'clip')}
        >
            <option value="none">не обрезать</option>
            <option value="clip">обрезать по скруглению</option>
        </select>
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
            label: 'cl',
            Component: ClipNumberingSelectField,
            visibility: () => hasBorderRadius,
            props: { title: 'обрезка по скруглению' },
        },
    ]
}
