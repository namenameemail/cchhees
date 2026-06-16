import React from 'react'
import { ParameterInputComponentProps } from './index'

export enum ParameterTypes {
    Array = 'Array',
    Form1 = 'Form1',
    TextInput = 'TextInput',
    NumberInput = 'NumberInput',
    XYDrag = 'XYDrag',
    XYDragPointerLock = 'XYDragPointerLock',
    XDrag = 'XDrag',
    YDrag = 'yDrag',
    XDragPointerLock = 'XDragPointerLock',
    YDragPointerLock = 'YDragPointerLock',
    SelectArray = 'SelectArray',
    Checkbox = 'Checkbox',
    ColorInput = 'ColorInput',
    FileSVG = 'FileSVG',
}

export interface Form1FieldConfig<StateType> {
    name: string
    type?: ParameterTypes
    Component?: React.ComponentType<ParameterInputComponentProps>
    props?: any
    visibility?: (state: StateType) => boolean
    propsByState?: (state: StateType) => any
    /** Short 2–3 letter label (labeled layout). */
    label?: string
    /** Grid column span when fieldLayout is `labeled`. */
    column?: 'half' | 'full'
}