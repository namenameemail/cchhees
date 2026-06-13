import React, { useCallback, useMemo } from 'react'
import { Form1 } from '../Form1'
import { Form1FieldConfig } from '../Form1/types'

export interface FormItemProps<ItemState> {
    className?: string
    itemFormClassName?: string
    index: number
    value: ItemState
    arrayName?: string
    config: Form1FieldConfig<ItemState>[] | ((value: ItemState, index: number) => Form1FieldConfig<ItemState>[])
    onChange: (value: ItemState, index: number) => void
    onRemove: (index: number) => void
    onUp: (index: number) => void
    onDown: (index: number) => void
    isUpDownEnabled?: boolean
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
    onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}

export function FormItem<ItemState>(props: FormItemProps<ItemState>) {

    const {
        index, arrayName, value, onChange, onRemove, className, itemFormClassName, onUp,
        onDown, isUpDownEnabled, onMouseEnter, onMouseLeave,
    } = props

    const handleChange = useCallback((value: ItemState) => {

        onChange(value, index)
    }, [index, onChange])

    const handleRemove = useCallback(() => {
        onRemove(index)
    }, [index, onRemove])

    const handleUp = useCallback(() => {
        onUp(index)
    }, [index, onUp])
    const handleDown = useCallback(() => {
        onDown(index)
    }, [index, onDown])


    console.log('FormItem valuee', value)
    // const itemConfig = useMemo(() => {
    //     if (typeof props.config === 'function') {
    //         return props.config(value, index)
    //     } else {
    //         return props.config
    //     }
    // },  [props.config, value, index])
    const itemConfig = (() => {
        if (typeof props.config === 'function') {
            return props.config(value, index)
        } else {
            return props.config
        }
    })()


    return (
        <div
            className={className}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Form1<ItemState>
                name={`${arrayName}-${index}`}
                value={value}
                config={itemConfig}
                onChange={handleChange}
                className={itemFormClassName}
            />
            <div>
                <button onClick={handleRemove}>x</button>
                {isUpDownEnabled && (<>
                    <button onClick={handleUp}>↑</button>
                    <button onClick={handleDown}>↓</button>
                </>)}
            </div>
        </div>
    )
}
