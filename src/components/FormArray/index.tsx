import * as React from 'react'
import { useCallback, useMemo } from 'react'

import { FormItem } from './FormItem'
import { Form1FieldConfig } from '../Form1/types'

export interface FormArrayProps<ItemState> {

    addText?: string
    addButtonPrefix?: React.ReactNode
    addButtonClassName?: string
    className?: string
    itemClassName?: string
    itemFormClassName?: string
    name?: string
    value: ItemState[]
    itemConfig: Form1FieldConfig<ItemState>[] | ((item: ItemState) => Form1FieldConfig<ItemState>[])
    onChange: (value: ItemState[], name?: string) => void
    getItemInitialValue: () => ItemState
    isUpDownEnabled?: boolean
    fieldLayout?: 'default' | 'labeled'
    instantRemove?: boolean
    minItems?: number
    addAtStart?: boolean
}

export function FormArray<ItemState>(props: FormArrayProps<ItemState>) {

    const {
        value,
        onChange,
        getItemInitialValue,
        name,
        itemConfig,
        className,
        itemClassName,
        itemFormClassName,
        isUpDownEnabled,
        fieldLayout,
        instantRemove,
        minItems = 0,
        addText = 'add',
        addButtonPrefix,
        addButtonClassName,
        addAtStart = false,
    } = props

    const handleItemChange = useCallback((newItemValue: ItemState, index: number) => {
        const newValue = [...value]
        newValue[index] = newItemValue

        onChange(newValue, name)
    }, [name, value, onChange])

    const handleItemRemove = useCallback((index: number) => {
        const newValue = [...value]
        newValue.splice(index, 1)
        onChange(newValue, name)
    }, [name, value, onChange])
    const handleItemUp = useCallback((index: number) => {
        if (index < value.length - 1) {
            const newValue = [...value]
            const temp = newValue[index];
            newValue[index] = newValue[index + 1];
            newValue[index + 1] = temp;
            onChange(newValue, name)
        }

    }, [name, value, onChange])
    const handleItemDown = useCallback((index: number) => {
        if (index > 0) {
            const newValue = [...value]
            const temp = newValue[index];
            newValue[index] = newValue[index - 1];
            newValue[index - 1] = temp;
            onChange(newValue, name)
        }
    }, [name, value, onChange])

    const handleItemAdd = useCallback(() => {
        const newValue = addAtStart
            ? [getItemInitialValue(), ...value]
            : [...value, getItemInitialValue()]
        onChange(newValue, name)
    }, [name, value, onChange, getItemInitialValue, addAtStart])

    const addButton = (addButtonPrefix || addText) ? (
        <div className={addButtonClassName}>
            {addButtonPrefix}
            {addText && <button type="button" onClick={handleItemAdd}>{addText}</button>}
        </div>
    ) : null

    return (
        <div className={className}>
            {addAtStart && addButton}
            {value.map((item: ItemState, index) => {
                return (
                    <FormItem<ItemState>
                        itemFormClassName={itemFormClassName}
                        arrayName={name}
                        className={itemClassName}
                        key={index}
                        index={index}
                        value={item}
                        config={itemConfig}
                        onChange={handleItemChange}
                        onRemove={handleItemRemove}
                        onUp={handleItemUp}
                        onDown={handleItemDown}
                        isUpDownEnabled={isUpDownEnabled}
                        fieldLayout={fieldLayout}
                        instantRemove={instantRemove}
                        canRemove={value.length > minItems}
                    />
                )
            })}
            {!addAtStart && addButton}
        </div>
    )
}
