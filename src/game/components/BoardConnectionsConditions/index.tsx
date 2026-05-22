import React, { useCallback, useRef, useState } from 'react'
import styles from '../BoardConditions/styles.module.css'
import { useGameContext } from '../../context'
import { ParameterTypes } from '../../../components/Form1/types'
import { FormArray } from '../../../components/FormArray'
import { ParameterInputComponentProps } from '../../../components/Form1'
import {
    BoardConnectionsConditionItem,
    ConnectionConditionItem,
    ConnectionConditionItemType,
} from '../../types/connections'
import { ConnectionSVG } from '../ConnectionSVG'
import cn from 'classnames'
import { copyCellParamsService } from '../BoardConditions/CopyCellParamsService'
import { ConnectionParametersFormBase } from '../ConnectionParametersForm/ConnectionParametersForm'

export interface ConnectionsConditionsProps {

}

const paramsConfigByConnectionConditionItemType = {
    [ConnectionConditionItemType.anbDiagonalUp]: [
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
    [ConnectionConditionItemType.anbDiagonalDown]: [
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
    [ConnectionConditionItemType.anbHorizontal]: [
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
    [ConnectionConditionItemType.anbVertical]: [
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
    [ConnectionConditionItemType.xFrom]: [
        {
            name: 'x',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'x' },
        },
    ],
    [ConnectionConditionItemType.xTo]: [
        {
            name: 'x',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'x' },
        },
    ],
    [ConnectionConditionItemType.yFrom]: [
        {
            name: 'y',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'y' },
        },
    ],
    [ConnectionConditionItemType.yTo]: [
        {
            name: 'y',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'y' },
        },
    ],
}

const parametersConfig = [
    {
        name: 'connectionConditions',
        type: ParameterTypes.Array,
        props: {
            addText: '+',
            className: styles.cellConditionsForm,
            itemClassName: styles.cellConditionItemForm,
            itemConfig: (item: ConnectionConditionItem) => {

                const byType = paramsConfigByConnectionConditionItemType[item.type] || []

                return [
                    {
                        name: 'type',
                        type: ParameterTypes.SelectArray,
                        props: {
                            className: styles.typeSelect,
                            options: Object.values(ConnectionConditionItemType),
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
            getItemInitialValue: (): ConnectionConditionItem => ({
                type: ConnectionConditionItemType.anbDiagonalUp,
                paramsByType: {
                    [ConnectionConditionItemType.anbDiagonalUp]: { a: 2, b: 0 },
                    [ConnectionConditionItemType.anbDiagonalDown]: { a: 2, b: 0 },
                    [ConnectionConditionItemType.anbVertical]: { a: 2, b: 0 },
                    [ConnectionConditionItemType.anbHorizontal]: { a: 2, b: 0 },
                    [ConnectionConditionItemType.yFrom]: { y: 2 },
                    [ConnectionConditionItemType.yTo]: { y: 2 },
                    [ConnectionConditionItemType.xTo]: { x: 2 },
                    [ConnectionConditionItemType.xFrom]: { x: 2 },
                },
            }),
        },
    },
    {
        name: 'connectionParams',
        Component: (props: ParameterInputComponentProps) => {
            const inputRef = useRef<HTMLInputElement>(null)

            const [isOpen, setIsOpen] = useState(false)
            const [isSelected, setIsSelected] = useState(false)

            const { value, onChange, name } = props

            const handleChange = useCallback((value) => onChange(name, value), [name, onChange])
            const handleClick = useCallback(() => inputRef.current?.focus({ preventScroll: true }), [inputRef])
            const handleDoubleClick = useCallback(() => setIsOpen(!isOpen), [isOpen])
            const handleFocus = useCallback((e) => {
                setIsSelected(true)
            }, [])
            const handleBlur = useCallback(() => setIsSelected(false), [])
            const handleCopy = useCallback(() => copyCellParamsService.setValue(value), [value])
            const handlePaste = useCallback((e) => {
                e.preventDefault()
                handleChange(copyCellParamsService.getValue())
            }, [handleChange])

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
                    <ConnectionSVG
                        className={cn(styles.preview, {
                            [styles.selected]: isSelected,
                        })}
                        connectionParams={value}
                        onClick={handleClick}
                        onDoubleClick={handleDoubleClick}
                    />
                    {isOpen && (
                        <ConnectionParametersFormBase
                            className={styles.connectionParamsForm}
                            value={value}
                            onChange={handleChange}
                        />
                    )}
                </div>
            )

        },
    },
]

export const ConnectionsConditions: React.FC<ConnectionsConditionsProps> = () => {

    const { mode, state, setBoardConnectionsConditions, connectionParamsBrushState } = useGameContext()

    const handleChange = useCallback((value: BoardConnectionsConditionItem[]) => {
        console.log('ww2', value)
        setBoardConnectionsConditions(value)
    }, [setBoardConnectionsConditions])

    const getItemInitialValue = useCallback(() => {
        return {
            connectionConditions: [],
            connectionParams: connectionParamsBrushState,
        }
    }, [connectionParamsBrushState])
    return (
        <div>
            <FormArray<BoardConnectionsConditionItem>
                isUpDownEnabled
                addText='connection'
                className={styles.array}
                itemClassName={styles.item}
                itemFormClassName={styles.itemForm}
                value={state.connectionsConditions}
                onChange={handleChange}
                itemConfig={parametersConfig}
                getItemInitialValue={getItemInitialValue}
            />
        </div>
    )
}
