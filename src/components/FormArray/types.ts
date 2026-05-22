export enum ParameterTypes {
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
}

export interface FormArrayConfig<StateType> {
    name: string
    type: ParameterTypes
    props?: any
    visibility?: (state: StateType) => boolean
    propsByState?: (state: StateType) => any
}