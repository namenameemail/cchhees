import React, { FC } from 'react'
import styles from './styles.module.css'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import {
    BoardBackgroundImageFit,
    BoardParameters,
} from '../../types/boardParameters'
import { ParameterTypes } from '../../../components/Form1/types'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'

export interface BoardParametersFormProps {

}

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

const parametersConfig = (value: BoardParameters) => {
    const hasBackgroundImage = value.backgroundAssetId != null
    const imageFit = value.backgroundImageFit ?? BoardBackgroundImageFit.tile

    return [
        {
            name: 'n',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'n' },
        },
        {
            name: 'm',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'm' },
        },
        {
            name: 'cellXDistance',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'cellXDistance' },
        },
        {
            name: 'cellYDistance',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'cellYDistance' },
        },
        {
            name: 'background',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'background' },
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
            props: { placeholder: 'repeat width' },
        },
        {
            name: 'backgroundRepeatHeight',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { placeholder: 'repeat height' },
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
            props: { placeholder: 'borderRadius' },
        },
        {
            name: 'borderWidth',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'borderWidth' },
        },
        {
            name: 'borderColor',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'borderColor' },
        },
        {
            name: 'borderDasharray',
            type: ParameterTypes.TextInput,
            props: { placeholder: 'borderDasharray' },
        },
    ]
}

export const BoardParametersForm: React.FC<BoardParametersFormProps> = () => {
    const {
        state,
        setBoardParameters,
    } = useGameContext()

    return (
        <Form1<BoardParameters>
            className={styles.boardParametersForm}
            value={state.boardParameters}
            config={parametersConfig}
            onChange={setBoardParameters}
        />
    )
}
