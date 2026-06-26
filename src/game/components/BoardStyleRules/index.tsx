import React, { useCallback, useEffect, useRef, useState } from 'react'
import conditionStyles from '../BoardConditions/styles.module.css'
import ruleStyles from './styles.module.css'
import { useGameContext } from '../../context'
import { ParameterTypes } from '../../../components/Form1/types'
import { anbOffset, atLeastOne, nonNegative } from '../../../components/Form1/numberInputConstraints'
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
import { copyCellParamsService } from '../copyParamsServices'
import { ConnectionParametersFormBase } from '../ConnectionParametersForm/ConnectionParametersForm'
import { CellParametersFormBase } from '../CellParametersForm/CellParametersForm'
import { BoardStyleRule, isCellStyleRule } from '../../types/styleRules'
import { isShiftKeyEvent } from '../../keyboard'

export interface BoardStyleRulesProps {

}

const paramsConfigByCellConditionItemType = {
    [CellConditionItemType.anbX]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a', ...nonNegative } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b', ...anbOffset } },
    ],
    [CellConditionItemType.anbY]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a', ...nonNegative } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b', ...anbOffset } },
    ],
    [CellConditionItemType.coordinates]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne } },
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne } },
    ],
    [CellConditionItemType.coordinateX]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne } },
    ],
    [CellConditionItemType.coordinateY]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne } },
    ],
    [CellConditionItemType.xFrom]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne } },
    ],
    [CellConditionItemType.xTo]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne } },
    ],
    [CellConditionItemType.yFrom]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne } },
    ],
    [CellConditionItemType.yTo]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne } },
    ],
}

const paramsConfigByConnectionConditionItemType = {
    [ConnectionConditionItemType.anbDiagonalUp]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a', ...nonNegative } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b', ...anbOffset } },
    ],
    [ConnectionConditionItemType.anbDiagonalDown]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a', ...nonNegative } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b', ...anbOffset } },
    ],
    [ConnectionConditionItemType.anbHorizontal]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a', ...nonNegative } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b', ...anbOffset } },
    ],
    [ConnectionConditionItemType.anbVertical]: [
        { name: 'a', type: ParameterTypes.NumberInput, props: { placeholder: 'a', ...nonNegative } },
        { name: 'b', type: ParameterTypes.NumberInput, props: { placeholder: 'b', ...anbOffset } },
    ],
    [ConnectionConditionItemType.xFrom]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne } },
    ],
    [ConnectionConditionItemType.xTo]: [
        { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne } },
    ],
    [ConnectionConditionItemType.yFrom]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne } },
    ],
    [ConnectionConditionItemType.yTo]: [
        { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne } },
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
        <label className={ruleStyles.forceCheckbox} title="force">
            <input
                type="checkbox"
                checked={force}
                onChange={() => onChange('force', !force)}
            />
            f
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
            instantRemove
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
            <CellParametersFormBase
                className={cn(conditionStyles.cellParamsForm, ruleStyles.paramsForm)}
                value={value}
                onChange={handleChange}
            />
            <div className={ruleStyles.paramsPreviewPane}>
                <CellSVG
                    className={conditionStyles.preview}
                    cellParams={value}
                    onClick={() => inputRef.current?.focus()}
                />
            </div>
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
            <ConnectionParametersFormBase
                className={cn(conditionStyles.connectionParamsForm, ruleStyles.paramsForm)}
                value={value}
                onChange={handleChange}
            />
            <div className={ruleStyles.paramsPreviewPane}>
                <ConnectionSVG
                    className={conditionStyles.preview}
                    connectionParams={value}
                    onClick={() => inputRef.current?.focus({ preventScroll: true })}
                />
            </div>
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
        previewCellStyleRuleIndex,
        setPreviewCellStyleRuleIndex,
    } = useGameContext()

    const [hoveredRuleIndex, setHoveredRuleIndex] = useState<number | undefined>(undefined)

    const updatePreview = useCallback((index: number | undefined, shiftKey: boolean) => {
        if (index !== undefined && shiftKey && isCellStyleRule(state.styleRules[index])) {
            setPreviewCellStyleRuleIndex(index)
        } else {
            setPreviewCellStyleRuleIndex(undefined)
        }
    }, [state.styleRules, setPreviewCellStyleRuleIndex])

    const handleRuleMouseEnter = useCallback((index: number, event: React.MouseEvent) => {
        setHoveredRuleIndex(index)
        updatePreview(index, event.shiftKey)
    }, [updatePreview])

    const handleRuleMouseLeave = useCallback(() => {
        setHoveredRuleIndex(undefined)
        setPreviewCellStyleRuleIndex(undefined)
    }, [setPreviewCellStyleRuleIndex])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isShiftKeyEvent(event)) {
                updatePreview(hoveredRuleIndex, true)
            }
        }

        const handleKeyUp = (event: KeyboardEvent) => {
            if (isShiftKeyEvent(event)) {
                setPreviewCellStyleRuleIndex(undefined)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [hoveredRuleIndex, updatePreview, setPreviewCellStyleRuleIndex])

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
                <button type="button" onClick={handleAddConnection}>+conn</button>
            </div>
            <div className={ruleStyles.array}>
                {state.styleRules.map((item, index) => (
                    <FormItem<BoardStyleRule>
                        key={index}
                        itemFormClassName={ruleStyles.itemForm}
                        className={cn(
                            ruleStyles.item,
                            previewCellStyleRuleIndex === index && ruleStyles.itemPreviewActive,
                        )}
                        index={index}
                        value={item}
                        config={getItemConfig}
                        onChange={handleItemChange}
                        onRemove={handleItemRemove}
                        onUp={handleItemUp}
                        onDown={handleItemDown}
                        isUpDownEnabled
                        onMouseEnter={(event) => handleRuleMouseEnter(index, event)}
                        onMouseLeave={handleRuleMouseLeave}
                    />
                ))}
            </div>
        </div>
    )
}
