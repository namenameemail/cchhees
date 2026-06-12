import React, { FC, useCallback } from 'react'
import { useGameContext } from '../../context'

import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { CellParameters, CellShape } from '../../types/cells'
import { isCellImageShape, ensureCellShapeParams } from '../../cellImageShape'
import { Mode } from '../../types'
import { ParameterTypes } from '../../../components/Form1/types'
import { CellSVG } from '../CellSVG'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import { isSvgManualHeight, isSvgManualWidth, normalizeSvgCellParams } from '../../cellSvgSize'
import styles from './styles.module.css'

const ImgAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    return (
        <ProjectImageSelect
            name={name}
            value={typeof value === 'number' ? value : null}
            placeholder="image asset"
            title="image asset"
            onChange={(assetId) => onChange(name, assetId)}
        />
    )
}

const SvgManualDimensionCheckbox: FC<ParameterInputComponentProps> = ({ name, value, onChange, props }) => {
    const checked = value !== false

    return (
        <label className={styles.svgManualCheckbox}>
            <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(name, !checked)}
            />
            <span>{props?.text || name}</span>
        </label>
    )
}

const createImageShapeConfig = (
    AssetSelectField: FC<ParameterInputComponentProps>,
) => () => [
    {
        name: 'assetId',
        Component: AssetSelectField,
    },
    {
        name: 'manualWidth',
        Component: SvgManualDimensionCheckbox,
        props: { text: 'width' },
    },
    {
        name: 'width',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'width %' },
        propsByState: (state: Record<string, unknown>) => ({
            disabled: !isSvgManualWidth(state),
        }),
    },
    {
        name: 'manualHeight',
        Component: SvgManualDimensionCheckbox,
        props: { text: 'height' },
    },
    {
        name: 'height',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'height %' },
        propsByState: (state: Record<string, unknown>) => ({
            disabled: !isSvgManualHeight(state),
        }),
    },
]

const paramsConfigByShapeType = {
    [CellShape.rect]: [
        {
            name: 'colour',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'colour' },
        },
        {
            name: 'width',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'width' },
        },
        {
            name: 'height',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'height' },
        },
        {
            name: 'strokeWidth',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'strokeWidth' },
        },
        {
            name: 'strokeColor',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'strokeColor' },
        },
        {
            name: 'strokeDasharray',
            type: ParameterTypes.TextInput,
            props: { placeholder: 'strokeDasharray' },
        },
    ],
    [CellShape.circle]: [
        {
            name: 'colour',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'colour' },
        },
        {
            name: 'width',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'width' },
        },
        {
            name: 'height',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'height' },
        },
        {
            name: 'strokeWidth',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'strokeWidth' },
        },
        {
            name: 'strokeColor',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'strokeColor' },
        },
        {
            name: 'strokeDasharray',
            type: ParameterTypes.TextInput,
            props: { placeholder: 'strokeDasharray' },
        },
    ],
    [CellShape.img]: createImageShapeConfig(ImgAssetSelectField),

}

export interface CellParametersFormProps {

}

const parametersConfig = (value: CellParameters) => {
    const shape = value.shape
    const shapeConfig = shape ? paramsConfigByShapeType[shape] : undefined
    const innerConfig = typeof shapeConfig === 'function'
        ? shapeConfig
        : () => shapeConfig ?? []

    return [
        {
            name: 'shape',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.shape,
                options: Object.values(CellShape),
                title: 'shape',
            },
        },
        {
            name: 'paramsByShape',
            type: ParameterTypes.Form1,
            props: {
                config: [
                    {
                        name: value.shape,
                        type: ParameterTypes.Form1,
                        props: {
                            config: innerConfig,
                            className: styles.cellParametersFormByShape,
                        },
                    },
                ],
            },
        },

    ]
}

export const CellParametersForm: React.FC<CellParametersFormProps> = () => {

    const { mode, state, setMode, setCellParametersBrushState, cellParametersBrushState } = useGameContext()

    const handleBrushModeClick = useCallback(() => {
        setMode(mode === Mode.PaintTheBoard ? Mode.Game : Mode.PaintTheBoard)
    }, [setMode, mode])

    return (
        <div className={styles.cellParametersFormLayout}>
            <div className={styles.topRow}>
                <div>cell</div>
                <div>
                    <button onClick={handleBrushModeClick}>use{mode === Mode.PaintTheBoard ? ' <' : ''}</button>
                </div>
            </div>
            <div className={styles.secondRow}>
                <CellParametersFormBase
                    className={styles.cellParametersForm}
                    value={cellParametersBrushState}
                    onChange={setCellParametersBrushState}
                />
                <CellSVG cellParams={cellParametersBrushState}/>
            </div>


        </div>
    )
}

export interface CellParametersFormBaseProps {
    className?: string
    value: CellParameters
    onChange: (value: CellParameters) => void
}

export const CellParametersFormBase: React.FC<CellParametersFormBaseProps> = (props) => {
    const { value, onChange, className } = props

    const handleChange = useCallback((nextValue: CellParameters) => {
        const withShapeParams = ensureCellShapeParams(nextValue)
        const shape = withShapeParams.shape

        if (isCellImageShape(shape)) {
            const imageParams = withShapeParams.paramsByShape?.[shape]
            if (imageParams) {
                const normalized = normalizeSvgCellParams(imageParams)
                if (normalized !== imageParams) {
                    onChange({
                        ...withShapeParams,
                        paramsByShape: {
                            ...withShapeParams.paramsByShape,
                            [shape]: normalized,
                        },
                    })
                    return
                }
            }
        }

        onChange(withShapeParams)
    }, [onChange])

    return (
        <Form1<CellParameters>
            className={className}
            config={parametersConfig}
            value={value}
            onChange={handleChange}
        />
    )
}
