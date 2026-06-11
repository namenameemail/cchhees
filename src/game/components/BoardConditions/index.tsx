import React, { useCallback, useRef, useState } from 'react'
import styles from './styles.module.css'
import { useGameContext } from '../../context'
import { BoardConditionItem, CellConditionItem, CellConditionItemType } from '../../types/conditions'
import { ParameterTypes } from '../../../components/Form1/types'
import { FormArray } from '../../../components/FormArray'
import { CellSVG } from '../CellSVG'
import { ParameterInputComponentProps } from '../../../components/Form1'
import cn from 'classnames'
import { CellParametersFormBase } from '../CellParametersForm/CellParametersForm'
import { copyCellParamsService } from './CopyCellParamsService'

export interface ConditionsProps {

}

const paramsConfigByCellConditionItemType = {
    [CellConditionItemType.anbX]: [
        {
            name: 'a',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'a' },
        },
        {
            name: 'b',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'b' },
        },
    ],
    [CellConditionItemType.anbY]: [
        {
            name: 'a',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'a' },
        },
        {
            name: 'b',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'b' },
        },
    ],
    [CellConditionItemType.coordinates]: [
        {
            name: 'x',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'x' },
        },
        {
            name: 'y',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'y' },
        },
    ],
    [CellConditionItemType.coordinateX]: [
        {
            name: 'x',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'x' },
        },
    ],
    [CellConditionItemType.coordinateY]: [
        {
            name: 'y',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'y' },
        },
    ],
    [CellConditionItemType.xFrom]: [
        {
            name: 'x',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'x' },
        },
    ],
    [CellConditionItemType.xTo]: [
        {
            name: 'x',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'x' },
        },
    ],
    [CellConditionItemType.yFrom]: [
        {
            name: 'y',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'y' },
        },
    ],
    [CellConditionItemType.yTo]: [
        {
            name: 'y',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'y' },
        },
    ],
}

const parametersConfig = [
    {
        name: 'cellConditions',
        type: ParameterTypes.Array,
        props: {
            addText: '+',
            className: styles.cellConditionsForm,
            itemClassName: styles.cellConditionItemForm,
            itemConfig: (item: CellConditionItem) => {

                const byType = paramsConfigByCellConditionItemType[item.type] || []

                return [
                    {
                        name: 'type',
                        type: ParameterTypes.SelectArray,
                        props: {
                            className: styles.typeSelect,
                            options: Object.values(CellConditionItemType),
                            title: 'type',
                        },
                    },
                    {
                        name: 'paramsByType',
                        type: ParameterTypes.Form1,
                        props: {
                            className: styles.paramsByTypeForm,
                            config: [
                                {
                                    name: item.type,
                                    type: ParameterTypes.Form1,
                                    props: {
                                        config: byType,
                                        className: styles.paramsByTypeItemForm,
                                    },
                                },
                            ],
                        },
                    },
                ]
            },
            getItemInitialValue: (): CellConditionItem => ({
                type: CellConditionItemType.white,
                paramsByType: {
                    [CellConditionItemType.anbY]: { a: 2, b: 0 },
                    [CellConditionItemType.anbX]: { a: 2, b: 0 },
                },
            }),
        },
    },
    {
        name: 'cellParams',
        Component: (props: ParameterInputComponentProps) => {
            const inputRef = useRef<HTMLInputElement>(null)

            const [isOpen, setIsOpen] = useState(false)
            const [isSelected, setIsSelected] = useState(false)

            const { value, onChange, name } = props

            const handleChange = useCallback((value) => onChange(name, value), [name, onChange])
            const handleClick = useCallback(() => inputRef.current?.focus(), [inputRef])
            const handleDoubleClick = useCallback(() => setIsOpen(!isOpen), [isOpen])
            const handleFocus = useCallback(() => setIsSelected(true), [])
            const handleBlur = useCallback(() => setIsSelected(false), [])
            const handleCopy = useCallback(() => copyCellParamsService.setValue(value), [value])
            const handlePaste = useCallback(() => handleChange(copyCellParamsService.getValue()), [handleChange])

            return (
                <div className={styles.cellParams}>
                    <input
                        className={styles.hiddenInput}
                        ref={inputRef}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onCopy={handleCopy}
                        onPaste={handlePaste}
                    />
                    <CellSVG
                        className={cn(styles.preview, {
                            [styles.selected]: isSelected
                        })}
                        cellParams={value}
                        onClick={handleClick}
                        onDoubleClick={handleDoubleClick}
                    />
                    {isOpen && (
                        <CellParametersFormBase
                            className={styles.cellParamsForm}
                            value={value}
                            onChange={handleChange}
                        />
                    )}
                </div>
            )
        },
    },
]

export const Conditions: React.FC<ConditionsProps> = () => {

    const { mode, state, setBoardConditions, cellParametersBrushState } = useGameContext()

    const handleChange = useCallback((value: BoardConditionItem[]) => {
        setBoardConditions(value)
    }, [setBoardConditions])

    const getItemInitialValue = useCallback(() => {
        return {
            cellConditions: [],
            cellParams: cellParametersBrushState,
        }
    }, [cellParametersBrushState])

    return (
        <div>
            <FormArray<BoardConditionItem>
                className={styles.array}
                itemClassName={styles.item}
                itemFormClassName={styles.itemForm}
                isUpDownEnabled
                addText='cell'
                value={state.boardConditions}
                onChange={handleChange}
                itemConfig={parametersConfig}
                getItemInitialValue={getItemInitialValue}
            />
        </div>
    )
}
