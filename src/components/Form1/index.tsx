import * as React from 'react'
import { useMemo, useRef, useState } from 'react'
import styles from './styles.module.css'
import cn from 'classnames'
import { Form1FieldConfig, ParameterTypes } from './types'
import { BlurEnterNumberInput, BlurEnterTextInput, DragHandler } from 'bbuutoonnss'
import { FormArray } from '../FormArray'
import { svgToDataURL } from './utils'
import { ColorAutocompleteInput } from '../colors/ColorAutocompleteInput'

export interface Form1Props<StateType> {
    name?: any
    className?: string
    value: StateType
    config: Form1FieldConfig<StateType>[] | ((value: StateType) => Form1FieldConfig<StateType>[])
    onChange: (value: StateType, name?: any) => void
}

export function Form1<StateType>(props: Form1Props<StateType>) {
    const { value, name, onChange, className } = props

    const handleParameterChange = React.useCallback((paramName: string, newParamValue: any) => {

        onChange({
            ...value,
            [paramName]: newParamValue,
        }, name)
    }, [onChange, value, name])

    const config = (() => {
        if (typeof props.config === 'function') {
            return props.config(value)
        } else {
            return props.config
        }
    })()

    return (
        <div className={cn(styles.form1, className)}>
            {config.map(({ name, type, Component, props, propsByState, visibility }) => {
                return (
                    <ParameterComponent<StateType>
                        key={name}
                        name={name}
                        type={type}
                        Component={Component}
                        visibility={visibility}
                        state={value}
                        props={props}
                        propsByState={propsByState}
                        onChange={handleParameterChange}
                    />
                )
            })}
        </div>
    )
}

export interface ParameterInputComponentProps {
    name: string
    value: any

    onChange(name: string, value: any)

    props: any
}

const rotateVector = ({ x, y }, angle) => {
    const ang = -angle * (Math.PI / 180)
    const cos = Math.cos(ang)
    const sin = Math.sin(ang)
    return { x: x * cos - y * sin, y: x * sin + y * cos }
}

export interface ParameterComponentProps<StateType> {
    name: string
    type?: ParameterTypes
    Component?: React.ComponentType<ParameterInputComponentProps>
    props?: any
    propsByState?: (state: StateType) => any
    visibility?: (state: StateType) => boolean
    state: StateType
    onChange: (name: string, value: any) => void
}

export function ParameterComponent<StateType>(props: ParameterComponentProps<StateType>) {
    const {
        state,
        onChange,
        type,
        Component: _Component,
        name,
        props: inputProps,
        propsByState,
        visibility,
    } = props

    const Component = _Component || (type ? inputComponentsByParameterType[type] : undefined)
    const isVisible = !visibility || visibility(state)

    const _inputProps = useMemo<any>(() => ({
        ...inputProps,
        ...(propsByState?.(state) || {}),
    }), [inputProps, propsByState, state])

    return (
        (isVisible && Component) ?
            <Component
                value={state?.[name]}
                props={_inputProps}
                name={name}
                onChange={onChange}
            /> : null
    )
}

export const inputComponentsByParameterType: {
    [type: string]: React.ComponentType<ParameterInputComponentProps>
} = {
    [ParameterTypes.Array]: ({ name, value, onChange, props }) => {
        const handleChange = React.useCallback((newValue) => {
            console.log(3, name, newValue)
            onChange(name, newValue)
        }, [onChange, name])
        return (
            <FormArray
                name={name}
                value={value}
                onChange={handleChange}
                itemConfig={props.itemConfig}
                getItemInitialValue={props.getItemInitialValue}
                {...props}
            />
        )
    },
    [ParameterTypes.Form1]: ({ name, value, onChange, props }) => {
        const handleChange = React.useCallback((newValue) => {
            onChange(name, newValue)
        }, [onChange, name])
        return (
            <Form1
                value={value}
                onChange={handleChange}
                {...props}
            />
        )
    },
    [ParameterTypes.TextInput]: ({ name, value, onChange, props }) => {
        const handleChange = React.useCallback((value) => {
            onChange(name, value)
        }, [onChange, name])
        return (
            <BlurEnterTextInput
                changeOnEnter
                changeOnBlur
                resetOnBlur
                value={value}
                onChange={handleChange}
                title={props.placeholder}
                {...props}
            />
        )
    },
    [ParameterTypes.ColorInput]: ({ name, value, onChange, props }) => {
        const handleChange = React.useCallback((nextValue) => {
            onChange(name, nextValue)
        }, [onChange, name])

        return (
            <ColorAutocompleteInput
                value={typeof value === 'string' ? value : ''}
                onChange={handleChange}
                placeholder={props?.placeholder}
                title={props?.title || props?.placeholder}
                changeOnEnter
                changeOnBlur
                resetOnBlur
                className={props?.className}
            />
        )
    },
    [ParameterTypes.NumberInput]: ({ name, value, onChange, props }) => {
        const handleChange = React.useCallback((value) => {
            onChange(name, +value)
        }, [onChange, name])
        return (
            <BlurEnterNumberInput
                changeOnEnter
                resetOnBlur
                value={value}
                onChange={handleChange}
                title={props.placeholder}
                {...props}
            />
        )
    },
    [ParameterTypes.XYDrag]: ({ value, onChange, name, props }) => {
        const handleChange = React.useCallback(({ x, y }, e, savedValue) => {
            onChange(name, [savedValue[0] + x, savedValue[1] + y])
        }, [onChange, name])
        return (
            <DragHandler<[number, number]>
                saveValue={value}
                onDrag={handleChange}
                pointerLock={false}
                className={`${styles.form1field} ${styles.cursorPointer}`}
            >{props?.text || name} {value[0]},{value[1]}</DragHandler>
        )
    },
    [ParameterTypes.XYDragPointerLock]: ({ value, onChange, name, props }) => {

        const angle = props?.angle || 0
        const handleChange = React.useCallback((vector, e, savedValue) => {
            const { x, y } = rotateVector(vector, angle)
            onChange(name, [savedValue[0] + x, savedValue[1] + y])
        }, [onChange, angle, name])
        return (
            <DragHandler<[number, number]>
                pointerLock
                saveValue={value}
                onDrag={handleChange}
                className={`${styles.form1field} ${styles.cursorPointer}`}
            >{props?.text || name} {value[0].toFixed(0)},{value[1].toFixed(0)}</DragHandler>
        )
    },
    [ParameterTypes.XDrag]: ({ value, onChange, name, props }) => {

        const handleChange = React.useCallback(({ x, y }, e, savedValue) => {
            onChange(name, Math.max(0, savedValue + x))
        }, [onChange, name])

        return (
            <DragHandler<number>
                saveValue={value}
                onDrag={handleChange}
                className={styles.form1field}
            >{props?.text || name} {value}</DragHandler>
        )
    },
    [ParameterTypes.YDrag]: ({ value, onChange, name, props }) => {

        const handleChange = React.useCallback(({ x, y }, e, savedValue) => {
            onChange(name, Math.max(0, savedValue - y))
        }, [onChange, name])

        return (
            <DragHandler<number>
                saveValue={value}
                onDrag={handleChange}
                className={styles.form1field}
            >{props?.text || name} {value}</DragHandler>
        )
    },
    [ParameterTypes.XDragPointerLock]: ({ value, onChange, name, props }) => {

        const handleChange = React.useCallback(({ x, y }, e, savedValue) => {
            onChange(name, Math.max(0, savedValue + x))
        }, [onChange, name])

        return (
            <DragHandler<number>
                pointerLock
                saveValue={value}
                onDrag={handleChange}
                className={styles.form1field}
            >{props?.text || name} {value}</DragHandler>
        )
    },
    [ParameterTypes.YDragPointerLock]: ({ value, onChange, name, props }) => {

        const handleChange = React.useCallback(({ x, y }, e, savedValue) => {
            onChange(name, Math.max(0, savedValue - y))
        }, [onChange, name])

        return (
            <DragHandler<number>
                pointerLock
                saveValue={value}
                onDrag={handleChange}
                className={styles.form1field}
            >{props?.text || name} {value}</DragHandler>
        )
    },
    [ParameterTypes.SelectArray]: ({ value, onChange, name, props }) => {

        const handleChange = React.useCallback((e) => {
            onChange(name, e.target.value)
        }, [onChange, name])

        return (
            <select
                className={props.className}
                value={value}
                onChange={handleChange}
                title={props.title}
            >
                {props.options.map(option => {
                    return <option key={option} value={option}>{option}</option>
                })}
            </select>
        )
    },
    [ParameterTypes.Checkbox]: ({ value, onChange, name, props }) => {

        const handleChange = React.useCallback((e) => {
            onChange(name, !value)
        }, [onChange, value, name])

        return (
            <div>
                <label>
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={handleChange}
                    />
                    {props?.text || name}
                </label>
            </div>
        )
    },
    [ParameterTypes.FileSVG]: ({ value, onChange, name, props }) => {

        const inputRef = useRef<HTMLInputElement>(null)


        const handleChange = React.useCallback((evt) => {

            const files = evt.target.files
            const file = files[0]

            if (file) {
                const reader = new FileReader()
                reader.onload = function (e) {
                    const content = e.target?.result
                    if (file.type.indexOf('svg') > 0) {
                        onChange(name, svgToDataURL(content as string))
                    }
                }
                reader.readAsText(file)
            }

        }, [onChange, value, name])

        return (
            <div className={styles.fileSVG}>
                <label>
                    <input

                        ref={inputRef}
                        type="file"
                        onChange={handleChange}
                    />
                    <button onClick={() => inputRef.current?.click()}>{props?.text || name}</button>
                </label>

                {/*<svg width={100} height={100}>*/}
                {/*    <image xlinkHref={value} width={50} height={50}></image>*/}
                {/*</svg>*/}
            </div>
        )
    },
}