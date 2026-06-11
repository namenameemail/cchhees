import React, { useCallback, useRef } from 'react'
import conditionStyles from '../BoardConditions/styles.module.css'
import ruleStyles from './styles.module.css'
import { useGameContext } from '../../context'
import { ParameterTypes } from '../../../components/Form1/types'
import { FormItem } from '../../../components/FormArray/FormItem'
import { FormArray } from '../../../components/FormArray'
import { ParameterInputComponentProps } from '../../../components/Form1'
import {
    ConnectionConditionItem,
    ConnectionConditionItemType,
} from '../../types/connections'
import { CellConditionItem, CellConditionItemType } from '../../types/conditions'
import { ConnectionSVG } from '../ConnectionSVG'
import { CellSVG } from '../CellSVG'
import cn from 'classnames'
import { copyCellParamsService } from '../BoardConditions/CopyCellParamsService'
import { ConnectionParametersFormBase } from '../ConnectionParametersForm/ConnectionParametersForm'
import { CellParametersFormBase } from '../CellParametersForm/CellParametersForm'
import { BoardStyleRule, isCellStyleRule } from '../../types/styleRules'

export interface BoardStyleRulesProps {

}

const paramsConfigByCellConditionItemType = {
    [CellConditionItemType.anbX]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a' } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b' } },
    ],
    [CellConditionItemType.anbY]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a' } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b' } },
    ],
    [CellConditionItemType.coordinates]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x' } },
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y' } },
    ],
    [CellConditionItemType.coordinateX]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x' } },
    ],
    [CellConditionItemType.coordinateY]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y' } },
    ],
    [CellConditionItemType.xFrom]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x' } },
    ],
    [CellConditionItemType.xTo]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x' } },
    ],
    [CellConditionItemType.yFrom]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y' } },
    ],
    [CellConditionItemType.yTo]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y' } },
    ],
}

const paramsConfigByConnectionConditionItemType = {
    [ConnectionConditionItemType.anbDiagonalUp]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a' } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b' } },
    ],
    [ConnectionConditionItemType.anbDiagonalDown]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a' } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b' } },
    ],
    [ConnectionConditionItemType.anbHorizontal]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a' } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b' } },
    ],
    [ConnectionConditionItemType.anbVertical]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a' } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b' } },
    ],
    [ConnectionConditionItemType.xFrom]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x' } },
    ],
    [ConnectionConditionItemType.xTo]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x' } },
    ],
    [ConnectionConditionItemType.yFrom]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y' } },
    ],
    [ConnectionConditionItemType.yTo]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y' } },
    ],
}

const cellConditionsArrayProps = {
    className: conditionStyles.cellConditionsForm,
    itemClassName: conditionStyles.cellConditionItemForm,
    itemConfig: (item: CellConditionItem) => {
        const byType = paramsConfigByCellConditionItemType[item.type] || []

        return [
            {
                name: 'type',
                type: ParameterTypes.SelectArray,
                props: {
                    className: conditionStyles.typeSelect,
                    options: Object.values(CellConditionItemType),
                    title: 'type',
                },
            },
            {
                name: 'paramsByType',
                type: ParameterTypes.Form1,
                props: {
                    className: conditionStyles.paramsByTypeForm,
                    config: [
                        {
                            name: item.type,
                            type: ParameterTypes.Form1,
                            props: {
                                config: byType,
                                className: conditionStyles.paramsByTypeItemForm,
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
}

const connectionConditionsArrayProps = {
    className: conditionStyles.cellConditionsForm,
    itemClassName: conditionStyles.cellConditionItemForm,
    itemConfig: (item: ConnectionConditionItem) => {
        const byType = paramsConfigByConnectionConditionItemType[item.type] || []

        return [
            {
                name: 'type',
                type: ParameterTypes.SelectArray,
                props: {
                    className: conditionStyles.typeSelect,
                    options: Object.values(ConnectionConditionItemType),
                    title: 'type',
                },
            },
            {
                name: 'paramsByType',
                type: ParameterTypes.Form1,
                props: {
                    className: conditionStyles.paramsByTypeForm,
                    config: [
                        {
                            name: item.type,
                            type: ParameterTypes.Form1,
                            props: {
                                config: byType,
                                className: conditionStyles.paramsByTypeItemForm,
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
}

function ConditionsArrayEditor(props: ParameterInputComponentProps) {
    const { name, value, onChange, props: fieldProps } = props
    const force = fieldProps.force ?? false

    const forcePrefix = (
        <label className={ruleStyles.forceCheckbox}>
            <input
                type="checkbox"
                checked={force}
                onChange={() => onChange('force', !force)}
            />
            force
        </label>
    )

    return (
        <FormArray
            name={name}
            value={value ?? []}
            onChange={(next) => onChange(name, next)}
            addText="+"
            addButtonPrefix={forcePrefix}
            addButtonClassName={ruleStyles.conditionsAddRow}
            className={fieldProps.className}
            itemClassName={fieldProps.itemClassName}
            itemConfig={fieldProps.itemConfig}
            getItemInitialValue={fieldProps.getItemInitialValue}
        />
    )
}

const cellConditionsField = {
    name: 'cellConditions',
    Component: ConditionsArrayEditor,
    props: cellConditionsArrayProps,
    propsByState: (state: BoardStyleRule) => ({
        force: !!state.force,
    }),
}

const connectionConditionsField = {
    name: 'connectionConditions',
    Component: ConditionsArrayEditor,
    props: connectionConditionsArrayProps,
    propsByState: (state: BoardStyleRule) => ({
        force: !!state.force,
    }),
}

function CellParamsEditor(props: ParameterInputComponentProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const { value, onChange, name } = props

    const handleChange = useCallback((nextValue) => onChange(name, nextValue), [name, onChange])
    const handleCopy = useCallback(() => copyCellParamsService.setValue(value), [value])
    const handlePaste = useCallback(() => handleChange(copyCellParamsService.getValue()), [handleChange])

    return (
        <div className={ruleStyles.paramsEditor}>
            <input
                className={conditionStyles.hiddenInput}
                ref={inputRef}
                onCopy={handleCopy}
                onPaste={handlePaste}
            />
            <CellSVG
                className={conditionStyles.preview}
                cellParams={value}
                onClick={() => inputRef.current?.focus()}
            />
            <CellParametersFormBase
                className={cn(conditionStyles.cellParamsForm, ruleStyles.paramsForm)}
                value={value}
                onChange={handleChange}
            />
        </div>
    )
}

function ConnectionParamsEditor(props: ParameterInputComponentProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const { value, onChange, name } = props

    const handleChange = useCallback((nextValue) => onChange(name, nextValue), [name, onChange])
    const handleCopy = useCallback(() => copyCellParamsService.setValue(value), [value])
    const handlePaste = useCallback((event) => {
        event.preventDefault()
        handleChange(copyCellParamsService.getValue())
    }, [handleChange])

    return (
        <div className={ruleStyles.paramsEditor}>
            <input
                className={conditionStyles.hiddenInput}
                ref={inputRef}
                onCopy={handleCopy}
                onPaste={handlePaste}
            />
            <ConnectionSVG
                className={conditionStyles.preview}
                connectionParams={value}
                onClick={() => inputRef.current?.focus({ preventScroll: true })}
            />
            <ConnectionParametersFormBase
                className={cn(conditionStyles.connectionParamsForm, ruleStyles.paramsForm)}
                value={value}
                onChange={handleChange}
            />
        </div>
    )
}

function getItemConfig(item: BoardStyleRule) {
    if (isCellStyleRule(item)) {
        return [
            cellConditionsField,
            {
                name: 'cellParams',
                Component: CellParamsEditor,
            },
        ]
    }

    return [
        connectionConditionsField,
        {
            name: 'connectionParams',
            Component: ConnectionParamsEditor,
        },
    ]
}

export const BoardStyleRules: React.FC<BoardStyleRulesProps> = () => {
    const {
        state,
        setStyleRules,
        cellParametersBrushState,
        connectionParamsBrushState,
    } = useGameContext()

    const handleChange = useCallback((value: BoardStyleRule[]) => {
        setStyleRules(value)
    }, [setStyleRules])

    const handleItemChange = useCallback((newItemValue: BoardStyleRule, index: number) => {
        const newValue = [...state.styleRules]
        newValue[index] = newItemValue
        handleChange(newValue)
    }, [state.styleRules, handleChange])

    const handleItemRemove = useCallback((index: number) => {
        const newValue = [...state.styleRules]
        newValue.splice(index, 1)
        handleChange(newValue)
    }, [state.styleRules, handleChange])

    const handleItemUp = useCallback((index: number) => {
        if (index < state.styleRules.length - 1) {
            const newValue = [...state.styleRules]
            const temp = newValue[index]
            newValue[index] = newValue[index + 1]
            newValue[index + 1] = temp
            handleChange(newValue)
        }
    }, [state.styleRules, handleChange])

    const handleItemDown = useCallback((index: number) => {
        if (index > 0) {
            const newValue = [...state.styleRules]
            const temp = newValue[index]
            newValue[index] = newValue[index - 1]
            newValue[index - 1] = temp
            handleChange(newValue)
        }
    }, [state.styleRules, handleChange])

    const handleAddCell = useCallback(() => {
        handleChange([
            ...state.styleRules,
            {
                kind: 'cell',
                cellConditions: [],
                cellParams: cellParametersBrushState,
            },
        ])
    }, [state.styleRules, handleChange, cellParametersBrushState])

    const handleAddConnection = useCallback(() => {
        handleChange([
            ...state.styleRules,
            {
                kind: 'connection',
                connectionConditions: [],
                connectionParams: connectionParamsBrushState,
            },
        ])
    }, [state.styleRules, handleChange, connectionParamsBrushState])

    return (
        <div className={ruleStyles.root}>
            <div className={ruleStyles.toolbar}>
                <button type="button" onClick={handleAddCell}>+ cell</button>
                <button type="button" onClick={handleAddConnection}>+ connection</button>
            </div>
            <div className={ruleStyles.array}>
                {state.styleRules.map((item, index) => (
                    <FormItem<BoardStyleRule>
                        key={index}
                        itemFormClassName={ruleStyles.itemForm}
                        className={ruleStyles.item}
                        index={index}
                        value={item}
                        config={getItemConfig}
                        onChange={handleItemChange}
                        onRemove={handleItemRemove}
                        onUp={handleItemUp}
                        onDown={handleItemDown}
                        isUpDownEnabled
                    />
                ))}
            </div>
        </div>
    )
}
