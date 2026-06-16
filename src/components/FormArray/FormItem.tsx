import React, { useCallback, useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { Form1 } from '../Form1'
import { Form1FieldConfig } from '../Form1/types'
import styles from './FormItem.module.css'

const DELETE_HOLD_MS = 1000

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

    const handleUp = useCallback(() => {
        onUp(index)
    }, [index, onUp])
    const handleDown = useCallback(() => {
        onDown(index)
    }, [index, onDown])

    const [isHoldingDelete, setIsHoldingDelete] = useState(false)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearHoldDelete = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsHoldingDelete(false)
    }, [])

    const handleDeletePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsHoldingDelete(true)
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            setIsHoldingDelete(false)
            onRemove(index)
        }, DELETE_HOLD_MS)
    }, [index, onRemove])

    const handleDeletePointerEnd = useCallback(() => {
        clearHoldDelete()
    }, [clearHoldDelete])

    useEffect(() => () => clearHoldDelete(), [clearHoldDelete])

    const itemConfig = (() => {
        if (typeof props.config === 'function') {
            return props.config(value, index)
        } else {
            return props.config
        }
    })()


    return (
        <div
            className={cn(className, isHoldingDelete && styles.itemHoldDeleting)}
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
                <button
                    type="button"
                    className={styles.deleteButton}
                    title="Удерживайте для удаления"
                    aria-label="Удалить"
                    onPointerDown={handleDeletePointerDown}
                    onPointerUp={handleDeletePointerEnd}
                    onPointerCancel={handleDeletePointerEnd}
                    onLostPointerCapture={handleDeletePointerEnd}
                >
                    x
                </button>
                {isUpDownEnabled && (<>
                    <button onClick={handleUp}>↑</button>
                    <button onClick={handleDown}>↓</button>
                </>)}
            </div>
        </div>
    )
}
