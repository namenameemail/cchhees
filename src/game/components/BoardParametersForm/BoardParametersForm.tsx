import React from "react";
import styles from './styles.module.css'
import {useGameContext} from "../../context";
import {Form1} from '../../../components/Form1'
import {BoardParameters} from '../../types/boardParameters'
import {ParameterTypes} from '../../../components/Form1/types'

export interface BoardParametersFormProps {

}

/**
 *
 * blackWidth
 * blackHeight
 * blackRadius
 * blackRadius
 *
 * **/

const parametersConfig = [
    {
        name: 'n',
        type: ParameterTypes.NumberInput,
        props: {placeholder: 'n'},
    },
    {
        name: 'm',
        type: ParameterTypes.NumberInput,
        props: {placeholder: 'm'},
    },
    {
        name: 'cellXDistance',
        type: ParameterTypes.NumberInput,
        props: {placeholder: 'cellXDistance'},
    },
    {
        name: 'cellYDistance',
        type: ParameterTypes.NumberInput,
        props: {placeholder: 'cellYDistance'},
    },
    // {
    //     name: 'swapOnEat',
    //     type: ParameterTypes.Checkbox,
    //     props: {text: 'swapOnEat'},
    // },
];

export const BoardParametersForm: React.FC<BoardParametersFormProps> = () => {

    const {
        state,
        setBoardParameters,

    } = useGameContext();

    return (
        <Form1<BoardParameters>
            className={styles.boardParametersForm}
            value={state.boardParameters}
            config={parametersConfig}
            onChange={setBoardParameters}
        />
    );
};
