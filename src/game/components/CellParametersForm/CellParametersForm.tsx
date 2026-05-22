import React, { useCallback } from 'react'
import { useGameContext } from '../../context'

import { Form1 } from '../../../components/Form1'
import { CellParameters, CellShape } from '../../types/cells'
import { Mode } from '../../types'
import { ParameterTypes } from '../../../components/Form1/types'
import { CellSVG } from '../CellSVG'
import styles from './styles.module.css'

export interface CellParametersFormProps {

}


const paramsConfigByShapeType = {
    [CellShape.rect]: [
        {
            name: 'colour',
            type: ParameterTypes.TextInput,
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
            type: ParameterTypes.TextInput,
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
            type: ParameterTypes.TextInput,
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
            type: ParameterTypes.TextInput,
            props: { placeholder: 'strokeColor' },
        },
        {
            name: 'strokeDasharray',
            type: ParameterTypes.TextInput,
            props: { placeholder: 'strokeDasharray' },
        },
    ],
    [CellShape.svg]: [
        {
            name: 'file',
            type: ParameterTypes.FileSVG,
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
    ],

}


const parametersConfig = (value) => {

    const byType = paramsConfigByShapeType[value.shape] || []

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
                            config: byType,
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

    return (
        <Form1<CellParameters>
            className={className}
            config={parametersConfig}
            value={value}
            onChange={onChange}

        />
    )
}
