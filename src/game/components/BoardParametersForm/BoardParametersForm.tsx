import React, { FC } from 'react'
import styles from './styles.module.css'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import {
    BoardBackgroundImageFit,
    BoardParameters,
} from '../../types/boardParameters'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'

export interface BoardParametersFormProps {

}

const BackgroundAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const hasAsset = typeof value === 'number'

    return (
        <div className={styles.fullWidth}>
            <ProjectImageSelect
                name={name}
                value={hasAsset ? value : null}
                placeholder="background image"
                title="background image"
                clearable
                onChange={(assetId) => onChange(name, assetId)}
            />
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
            props: { placeholder: 'n', ...atLeastOne },
        },
        {
            name: 'm',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'm', ...atLeastOne },
        },
        {
            name: 'cellXDistance',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'cellXDistance', ...atLeastOne },
        },
        {
            name: 'cellYDistance',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'cellYDistance', ...atLeastOne },
        },
        {
            name: 'showAxisLabels',
            type: ParameterTypes.Checkbox,
            props: { text: 'нумерация строк и столбцов' },
        },
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
        {
            name: 'figureAnimation',
            type: ParameterTypes.Form1,
            props: {
                className: styles.fullWidth,
                config: [
                    {
                        name: 'moveDurationMs',
                        type: ParameterTypes.NumberInput,
                        props: {
                            placeholder: 'анимация хода (мс)',
                            ...nonNegative,
                        },
                    },
                    {
                        name: 'fadeDurationMs',
                        type: ParameterTypes.NumberInput,
                        props: {
                            placeholder: 'анимация исчезновения (мс)',
                            ...nonNegative,
                        },
                    },
                ],
            },
        },
    ]
}

export const BoardParametersForm: React.FC<BoardParametersFormProps> = () => {
    const {
        state,
        setBoardParameters,
        boardParametersFormKey,
    } = useGameContext()

    return (
        <Form1<BoardParameters>
            key={boardParametersFormKey}
            className={styles.boardParametersForm}
            value={state.boardParameters}
            config={parametersConfig}
            onChange={setBoardParameters}
        />
    )
}
