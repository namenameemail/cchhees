import React, { FC } from 'react'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { ParameterTypes } from '../../../components/Form1/types'
import { nonNegative } from '../../../components/Form1/numberInputConstraints'
import {
    BoardMarkAppearance,
    BoardMarkFill,
    BoardMarkOverlay,
    BOARD_MARK_BLEND_MODE_OPTIONS,
    BOARD_MARK_FILL_TYPE_OPTIONS,
    BOARD_MARK_LAYER_OPTIONS,
} from '../../types/boardMarks'
import styles from './styles.module.css'

const percentProps = { ...nonNegative }

const GRADIENT_STOP_INITIAL = { offset: 50, color: '#00000088' }

const DEFAULT_GRADIENT_STOPS = [
    { offset: 0, color: '#00000088' },
    { offset: 100, color: '#00000088' },
]

const labeledNestedFormProps = {
    fieldLayout: 'labeled' as const,
    className: styles.markNestedForm,
}

const FillTypeSelectField: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    formState,
    onFieldsChange,
}) => {
    const current = typeof value === 'string' ? value : 'none'
    const isGradient = current === 'linear' || current === 'radial'
    const stops = formState?.stops ?? []

    const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextType = event.target.value
        if ((nextType === 'linear' || nextType === 'radial') && stops.length < 2) {
            onFieldsChange?.({
                [name]: nextType,
                stops: DEFAULT_GRADIENT_STOPS,
            })
            return
        }
        onChange(name, nextType)
    }

    const handleAddStop = () => {
        onFieldsChange?.({ stops: [...stops, { ...GRADIENT_STOP_INITIAL }] })
    }

    return (
        <div className={styles.markFillTypeControl}>
            <select
                className={styles.axisSideSelect}
                value={current}
                title="fill type"
                onChange={handleTypeChange}
            >
                {BOARD_MARK_FILL_TYPE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
            {isGradient && (
                <div className={styles.markStopsAddInline}>
                    <button type="button" onClick={handleAddStop}>+</button>
                </div>
            )}
        </div>
    )
}

function createFillConfig(value: BoardMarkFill): Form1FieldConfig<BoardMarkFill>[] {
    return [
        {
            name: 'type',
            label: 'tp',
            Component: FillTypeSelectField,
            props: { title: 'fill type' },
        },
        {
            name: 'color',
            label: 'c',
            type: ParameterTypes.ColorInput,
            visibility: (state) => (state?.type ?? 'none') === 'solid',
            props: { title: 'fill color', placeholder: 'fill color' },
        },
        {
            name: 'stops',
            type: ParameterTypes.Array,
            visibility: (state) => {
                const type = state?.type ?? 'none'
                return type === 'linear' || type === 'radial'
            },
            props: {
                className: styles.markStopsArray,
                addText: '',
                instantRemove: true,
                minItems: 2,
                itemClassName: styles.markStopItem,
                itemFormClassName: styles.markStopForm,
                getItemInitialValue: () => ({ ...GRADIENT_STOP_INITIAL }),
                itemConfig: [
                    {
                        name: 'offset',
                        type: ParameterTypes.NumberInput,
                        props: { title: 'offset %', placeholder: '%', ...nonNegative },
                    },
                    {
                        name: 'color',
                        type: ParameterTypes.ColorInput,
                        props: { title: 'color', placeholder: 'color' },
                    },
                ],
            },
        },
        {
            name: 'linearX1',
            label: 'x1',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { title: 'linear x1', placeholder: 'linear x1', ...percentProps },
        },
        {
            name: 'linearY1',
            label: 'y1',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { title: 'linear y1', placeholder: 'linear y1', ...percentProps },
        },
        {
            name: 'linearX2',
            label: 'x2',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { title: 'linear x2', placeholder: 'linear x2', ...percentProps },
        },
        {
            name: 'linearY2',
            label: 'y2',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { title: 'linear y2', placeholder: 'linear y2', ...percentProps },
        },
        {
            name: 'radialCx',
            label: 'cx',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'radial',
            props: { title: 'radial cx', placeholder: 'radial cx', ...percentProps },
        },
        {
            name: 'radialCy',
            label: 'cy',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'radial',
            props: { title: 'radial cy', placeholder: 'radial cy', ...percentProps },
        },
        {
            name: 'radialR',
            label: 'r',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'radial',
            props: { title: 'radial r', placeholder: 'radial r', ...percentProps },
        },
    ]
}

function createStrokeConfig(prefix: string): Form1FieldConfig<{ color?: string; width?: number; dasharray?: string }>[] {
    return [
        {
            name: 'color',
            label: 'c',
            type: ParameterTypes.ColorInput,
            props: { title: `${prefix} color`, placeholder: `${prefix} color` },
        },
        {
            name: 'width',
            label: 'w',
            type: ParameterTypes.NumberInput,
            props: { title: `${prefix} width`, placeholder: `${prefix} width`, ...nonNegative },
        },
        {
            name: 'dasharray',
            label: 'ds',
            type: ParameterTypes.TextInput,
            props: { title: `${prefix} dasharray`, placeholder: `${prefix} dasharray` },
        },
    ]
}

function createOverlayConfig(
    value: BoardMarkOverlay | undefined,
): Form1FieldConfig<BoardMarkOverlay>[] {
    const overlay = value ?? { fill: { type: 'none' }, stroke: {}, mixBlendMode: 'normal' }

    return [
        {
            name: 'fill',
            column: 'full',
            type: ParameterTypes.Form1,
            props: {
                ...labeledNestedFormProps,
                config: createFillConfig(overlay.fill ?? { type: 'none' }),
            },
        },
        {
            name: 'stroke',
            column: 'full',
            type: ParameterTypes.Form1,
            props: {
                ...labeledNestedFormProps,
                config: createStrokeConfig('overlay stroke'),
            },
        },
        {
            name: 'mixBlendMode',
            label: 'bm',
            type: ParameterTypes.SelectArray,
            props: {
                title: 'overlay blend mode',
                options: BOARD_MARK_BLEND_MODE_OPTIONS,
            },
        },
    ]
}

export function createBoardMarkAppearanceConfig(
    value: BoardMarkAppearance,
): Form1FieldConfig<BoardMarkAppearance>[] {
    return [
        {
            name: 'fill',
            column: 'full',
            type: ParameterTypes.Form1,
            props: {
                ...labeledNestedFormProps,
                config: createFillConfig(value.fill),
            },
        },
        {
            name: 'stroke',
            column: 'full',
            type: ParameterTypes.Form1,
            props: {
                ...labeledNestedFormProps,
                config: createStrokeConfig('stroke'),
            },
        },
        {
            name: 'layer',
            label: 'ly',
            type: ParameterTypes.SelectArray,
            props: {
                title: 'layer',
                options: BOARD_MARK_LAYER_OPTIONS,
            },
        },
        {
            name: 'mixBlendMode',
            label: 'bm',
            type: ParameterTypes.SelectArray,
            props: {
                title: 'blend mode',
                options: BOARD_MARK_BLEND_MODE_OPTIONS,
            },
        },
        {
            name: 'overlay',
            column: 'full',
            type: ParameterTypes.Form1,
            props: {
                ...labeledNestedFormProps,
                config: createOverlayConfig(value.overlay),
                initialValue: {
                    fill: { type: 'none' },
                    stroke: {},
                    mixBlendMode: 'normal',
                },
            },
        },
    ]
}
