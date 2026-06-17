import React, { useCallback } from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import { Form1 } from '../../../components/Form1'
import formStyles from '../../../components/Form1/styles.module.css'
import { Mode } from '../../types'
import { ParameterTypes } from '../../../components/Form1/types'
import { nonNegative } from '../../../components/Form1/numberInputConstraints'
import { ConnectionParams } from '../../types/connections'
import { ConnectionSVG } from '../ConnectionSVG'

import styles from './styles.module.css'

export interface ConnectionParametersFormProps {

}

const parametersConfig = [
    {
        name: 'strokeColor',
        type: ParameterTypes.ColorInput,
        props: { placeholder: 'strokeColor' },
    },
    {
        name: 'strokeWidth',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'strokeWidth', ...nonNegative },
    },
    {
        name: 'strokeDasharray',
        type: ParameterTypes.TextInput,
        props: { placeholder: 'strokeDasharray' },
    }, {
        name: 'strokeLinecap',
        type: ParameterTypes.SelectArray,
        props: {
            options: ['butt', 'round', 'square'],
            title: 'strokeLinecap',
        },
    },
]

export const ConnectionParametersForm: React.FC<ConnectionParametersFormProps> = () => {

    const { mode, state, setMode, setConnectionParamsBrushState, connectionParamsBrushState } = useGameContext()

    const handleBrushModeClick = useCallback(() => {
        setMode(mode === Mode.PaintTheBoardConnections ? Mode.Game : Mode.PaintTheBoardConnections)
    }, [setMode, mode])

    return (
        <div className={styles.connectionParametersFormLayout}>
            <div className={styles.topRow}>
                <div>connection</div>
                <div>
                    <button
                        onClick={handleBrushModeClick}>use{mode === Mode.PaintTheBoardConnections ? ' <' : ''}</button>
                </div>
            </div>

            <div className={styles.secondRow}>
                <ConnectionParametersFormBase
                    className={styles.connectionParametersForm}
                    value={connectionParamsBrushState}
                    onChange={setConnectionParamsBrushState}
                />
                <ConnectionSVG connectionParams={connectionParamsBrushState} />
            </div>
        </div>
    )
}

export interface ConnectionParametersFormBaseProps {
    className?: string
    value: ConnectionParams
    onChange: (value: ConnectionParams) => void
}

export const ConnectionParametersFormBase: React.FC<ConnectionParametersFormBaseProps> = (props) => {
    const { value, onChange, className } = props


    return (
        <Form1<ConnectionParams>
            className={cn(formStyles.compactGridForm, className)}
            config={parametersConfig}
            value={value}
            onChange={onChange}
        />
    )
}