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

function createFillConfig(value: BoardMarkFill): Form1FieldConfig<BoardMarkFill>[] {
    const fillType = value.type ?? 'none'

    return [
        {
            name: 'type',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.fullWidth,
                title: 'fill type',
                options: BOARD_MARK_FILL_TYPE_OPTIONS,
            },
        },
        {
            name: 'color',
            type: ParameterTypes.ColorInput,
            visibility: (state) => (state?.type ?? 'none') === 'solid',
            props: {
                placeholder: 'fill color',
                className: styles.fullWidth,
            },
        },
        {
            name: 'stops',
            type: ParameterTypes.Array,
            visibility: (state) => {
                const type = state?.type ?? 'none'
                return type === 'linear' || type === 'radial'
            },
            props: {
                className: styles.fullWidth,
                itemClassName: styles.markStopItem,
                itemFormClassName: styles.markStopForm,
                getItemInitialValue: () => ({ offset: 50, color: '#00000088' }),
                itemConfig: [
                    {
                        name: 'offset',
                        type: ParameterTypes.NumberInput,
                        props: { placeholder: 'offset %', ...nonNegative },
                    },
                    {
                        name: 'color',
                        type: ParameterTypes.ColorInput,
                        props: { placeholder: 'color', className: styles.fullWidth },
                    },
                ],
            },
        },
        {
            name: 'linearX1',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { placeholder: 'linear x1', ...percentProps },
        },
        {
            name: 'linearY1',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { placeholder: 'linear y1', ...percentProps },
        },
        {
            name: 'linearX2',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { placeholder: 'linear x2', ...percentProps },
        },
        {
            name: 'linearY2',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'linear',
            props: { placeholder: 'linear y2', ...percentProps },
        },
        {
            name: 'radialCx',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'radial',
            props: { placeholder: 'radial cx', ...percentProps },
        },
        {
            name: 'radialCy',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'radial',
            props: { placeholder: 'radial cy', ...percentProps },
        },
        {
            name: 'radialR',
            type: ParameterTypes.NumberInput,
            visibility: (state) => state?.type === 'radial',
            props: { placeholder: 'radial r', ...percentProps },
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
            type: ParameterTypes.Form1,
            props: {
                className: styles.markNestedForm,
                config: createFillConfig(overlay.fill ?? { type: 'none' }),
            },
        },
        {
            name: 'stroke',
            type: ParameterTypes.Form1,
            props: {
                className: styles.markNestedForm,
                config: [
                    {
                        name: 'color',
                        type: ParameterTypes.ColorInput,
                        props: { placeholder: 'overlay stroke color', className: styles.fullWidth },
                    },
                    {
                        name: 'width',
                        type: ParameterTypes.NumberInput,
                        props: { placeholder: 'overlay stroke width', ...nonNegative },
                    },
                    {
                        name: 'dasharray',
                        type: ParameterTypes.TextInput,
                        props: { placeholder: 'overlay stroke dasharray', className: styles.fullWidth },
                    },
                ],
            },
        },
        {
            name: 'mixBlendMode',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.fullWidth,
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
            type: ParameterTypes.Form1,
            props: {
                className: styles.markNestedForm,
                config: createFillConfig(value.fill),
            },
        },
        {
            name: 'stroke',
            type: ParameterTypes.Form1,
            props: {
                className: styles.markNestedForm,
                config: [
                    {
                        name: 'color',
                        type: ParameterTypes.ColorInput,
                        props: { placeholder: 'stroke color', className: styles.fullWidth },
                    },
                    {
                        name: 'width',
                        type: ParameterTypes.NumberInput,
                        props: { placeholder: 'stroke width', ...nonNegative },
                    },
                    {
                        name: 'dasharray',
                        type: ParameterTypes.TextInput,
                        props: { placeholder: 'stroke dasharray', className: styles.fullWidth },
                    },
                ],
            },
        },
        {
            name: 'layer',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.fullWidth,
                title: 'layer',
                options: BOARD_MARK_LAYER_OPTIONS,
            },
        },
        {
            name: 'mixBlendMode',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.fullWidth,
                title: 'blend mode',
                options: BOARD_MARK_BLEND_MODE_OPTIONS,
            },
        },
        {
            name: 'overlay',
            type: ParameterTypes.Form1,
            props: {
                className: styles.markNestedForm,
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
