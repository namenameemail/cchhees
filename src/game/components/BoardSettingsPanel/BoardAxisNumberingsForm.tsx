import React, { FC, useCallback } from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, integerStep, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { FormItem } from '../../../components/FormArray/FormItem'
import ruleStyles from '../BoardStyleRules/styles.module.css'
import { createAxisNumberingFrameFormConfig } from './boardSurfaceAppearanceForm'
import {
    AXIS_LABEL_ALIGN_LABELS,
    AXIS_LABEL_ALIGN_OPTIONS,
    AXIS_LABEL_GUTTER_ALIGN_LABELS,
    AXIS_LABEL_GUTTER_ALIGN_OPTIONS,
    AXIS_NUMBERING_EDGE_LABELS,
    AXIS_NUMBERING_FORMAT_LABELS,
    AXIS_NUMBERING_FORMAT_OPTIONS,
    AXIS_NUMBERING_HORIZONTAL_EDGE_OPTIONS,
    AXIS_NUMBERING_ORDER_LABELS,
    AXIS_NUMBERING_ORDER_OPTIONS,
    AXIS_NUMBERING_ORIENTATION_LABELS,
    AXIS_NUMBERING_ORIENTATION_OPTIONS,
    AXIS_NUMBERING_VERTICAL_EDGE_OPTIONS,
    AxisLabelAlign,
    AxisLabelGutterAlign,
    AxisNumberingEdge,
    AxisNumberingFormat,
    AxisNumberingOrder,
    AxisNumberingOrientation,
    BoardAxisNumbering,
    BoardAxisNumberingFrameSettings,
    BoardParameters,
} from '../../types/boardParameters'
import {
    createDefaultAxisNumbering,
    getAxisNumberingMaxEdgeInset,
    getAxisNumberingMaxSkip,
    normalizeAxisNumberingForBoard,
    resolveAxisNumberings,
} from '../../boardAxisLabels'
import { ProjectFontSelect } from '../../../projects/components/ProjectFontSelect'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import styles from './styles.module.css'

const OrientationSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const current = typeof value === 'string' ? value as AxisNumberingOrientation : 'horizontal'

    return (
        <select
            className={styles.axisSideSelect}
            value={current}
            title="ориентация"
            onChange={event => onChange(name, event.target.value as AxisNumberingOrientation)}
        >
            {AXIS_NUMBERING_ORIENTATION_OPTIONS.map(option => (
                <option key={option} value={option}>
                    {AXIS_NUMBERING_ORIENTATION_LABELS[option]}
                </option>
            ))}
        </select>
    )
}

function createEdgeSelectField(item: BoardAxisNumbering): FC<ParameterInputComponentProps> {
    return ({ name, value, onChange }) => {
        const options = item.orientation === 'horizontal'
            ? AXIS_NUMBERING_HORIZONTAL_EDGE_OPTIONS
            : AXIS_NUMBERING_VERTICAL_EDGE_OPTIONS
        const current = typeof value === 'string' ? value as AxisNumberingEdge : options[0]

        return (
            <select
                className={styles.axisSideSelect}
                value={current}
                title="сторона"
                onChange={event => onChange(name, event.target.value as AxisNumberingEdge)}
            >
                {options.map(option => (
                    <option key={option} value={option}>
                        {AXIS_NUMBERING_EDGE_LABELS[option]}
                    </option>
                ))}
            </select>
        )
    }
}

const OrderSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const current = typeof value === 'string' ? value as AxisNumberingOrder : 'forward'

    return (
        <select
            className={styles.axisSideSelect}
            value={current}
            title="порядок"
            onChange={event => onChange(name, event.target.value as AxisNumberingOrder)}
        >
            {AXIS_NUMBERING_ORDER_OPTIONS.map(option => (
                <option key={option} value={option}>
                    {AXIS_NUMBERING_ORDER_LABELS[option]}
                </option>
            ))}
        </select>
    )
}

const FormatSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const current = typeof value === 'string' ? value as AxisNumberingFormat : 'letter'

    return (
        <select
            className={styles.axisSideSelect}
            value={current}
            title="формат"
            onChange={event => onChange(name, event.target.value as AxisNumberingFormat)}
        >
            {AXIS_NUMBERING_FORMAT_OPTIONS.map(option => (
                <option key={option} value={option}>
                    {AXIS_NUMBERING_FORMAT_LABELS[option]}
                </option>
            ))}
        </select>
    )
}

const AlignSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const current = typeof value === 'string' ? value as AxisLabelAlign : 'center'

    return (
        <select
            className={styles.axisSideSelect}
            value={current}
            title="выравнивание в клетке"
            onChange={event => onChange(name, event.target.value as AxisLabelAlign)}
        >
            {AXIS_LABEL_ALIGN_OPTIONS.map(option => (
                <option key={option} value={option}>
                    {AXIS_LABEL_ALIGN_LABELS[option]}
                </option>
            ))}
        </select>
    )
}

const GutterAlignSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const current = typeof value === 'string' ? value as AxisLabelGutterAlign : 'center'

    return (
        <select
            className={styles.axisSideSelect}
            value={current}
            title="положение в полосе"
            onChange={event => onChange(name, event.target.value as AxisLabelGutterAlign)}
        >
            {AXIS_LABEL_GUTTER_ALIGN_OPTIONS.map(option => (
                <option key={option} value={option}>
                    {AXIS_LABEL_GUTTER_ALIGN_LABELS[option]}
                </option>
            ))}
        </select>
    )
}

const FontAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    return (
        <ProjectFontSelect
            name={name}
            value={typeof value === 'number' ? value : null}
            placeholder="шрифт"
            title="шрифт"
            onChange={(assetId) => onChange(name, assetId)}
        />
    )
}

const BackgroundAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const hasAsset = typeof value === 'number'

    return (
        <ProjectImageSelect
            name={name}
            value={hasAsset ? value : null}
            placeholder="фон"
            title="фон"
            clearable
            onChange={(assetId) => onChange(name, assetId)}
        />
    )
}

const numberingItemConfig = (item: BoardAxisNumbering, n: number, m: number) => {
    const stripPlaceholder = item.orientation === 'horizontal'
        ? 'толщина полосы (px)'
        : 'толщина полосы (px)'
    const maxSkipStart = getAxisNumberingMaxSkip(item, item.skipCellsEnd, n, m)
    const maxSkipEnd = getAxisNumberingMaxSkip(item, item.skipCellsStart, n, m)
    const maxEdgeInset = getAxisNumberingMaxEdgeInset(item, n, m)

    return [
        { name: 'orientation', label: 'or', Component: OrientationSelectField, props: { title: 'ориентация' } },
        { name: '_actionSpacer', gridSpacer: true },
        { name: 'edge', label: 'ed', Component: createEdgeSelectField(item), props: { title: 'сторона' } },
        { name: 'order', label: 'ord', Component: OrderSelectField, props: { title: 'порядок' } },
        { name: 'format', label: 'fmt', Component: FormatSelectField, props: { title: 'формат' } },
        {
            name: 'skipCellsStart',
            label: 's0',
            type: ParameterTypes.NumberInput,
            props: {
                title: item.orientation === 'horizontal' ? 'пропуск столбцов (нач.)' : 'пропуск строк (нач.)',
                placeholder: item.orientation === 'horizontal' ? 'пропуск столбцов (нач.)' : 'пропуск строк (нач.)',
                ...nonNegative,
                ...integerStep,
                max: maxSkipStart,
            },
        },
        {
            name: 'skipCellsEnd',
            label: 's1',
            type: ParameterTypes.NumberInput,
            props: {
                title: item.orientation === 'horizontal' ? 'пропуск столбцов (кон.)' : 'пропуск строк (кон.)',
                placeholder: item.orientation === 'horizontal' ? 'пропуск столбцов (кон.)' : 'пропуск строк (кон.)',
                ...nonNegative,
                ...integerStep,
                max: maxSkipEnd,
            },
        },
        {
            name: 'numberOffset',
            label: 'n+',
            type: ParameterTypes.NumberInput,
            props: { title: '+ к начальному числу', placeholder: '+ к начальному числу', ...integerStep },
        },
        {
            name: 'edgeInsetCells',
            label: 'in',
            type: ParameterTypes.NumberInput,
            props: {
                title: item.orientation === 'horizontal'
                    ? 'смещение внутрь (строк)'
                    : 'смещение внутрь (столбцов)',
                placeholder: item.orientation === 'horizontal'
                    ? 'смещение внутрь (строк)'
                    : 'смещение внутрь (столбцов)',
                ...nonNegative,
                ...integerStep,
                max: maxEdgeInset,
            },
        },
        {
            name: 'stripSize',
            label: 'st',
            type: ParameterTypes.NumberInput,
            props: { title: stripPlaceholder, placeholder: stripPlaceholder, ...atLeastOne },
        },
        {
            name: 'fontSize',
            label: 'fs',
            type: ParameterTypes.NumberInput,
            props: { title: 'font size', placeholder: 'font size', ...atLeastOne },
        },
        {
            name: 'color',
            label: 'fg',
            type: ParameterTypes.ColorInput,
            props: { title: 'color', placeholder: 'color' },
        },
        { name: 'fontAssetId', label: 'fn', Component: FontAssetSelectField, props: { title: 'шрифт' } },
        {
            name: 'offsetX',
            label: 'x',
            type: ParameterTypes.NumberInput,
            props: { title: 'offset X', placeholder: 'offset X' },
        },
        {
            name: 'offsetY',
            label: 'y',
            type: ParameterTypes.NumberInput,
            props: { title: 'offset Y', placeholder: 'offset Y' },
        },
        { name: 'align', label: 'al', Component: AlignSelectField, props: { title: 'выравнивание в клетке' } },
        { name: 'gutterAlign', label: 'ga', Component: GutterAlignSelectField, props: { title: 'положение в полосе' } },
        {
            name: 'background',
            label: 'bg',
            type: ParameterTypes.ColorInput,
            props: { title: 'фон', placeholder: 'фон' },
        },
        { name: 'backgroundAssetId', label: 'img', Component: BackgroundAssetSelectField, props: { title: 'фон' } },
    ]
}

function setAxisNumberings(
    boardParameters: BoardParameters,
    numberings: BoardAxisNumbering[],
): BoardParameters {
    const { showAxisLabels: _legacyShow, axisLabels: _legacyLabels, ...rest } = boardParameters
    const { n, m } = boardParameters

    return {
        ...rest,
        axisNumberings: numberings.map(item => normalizeAxisNumberingForBoard(item, n, m)),
    }
}

export const BoardAxisNumberingsForm: FC = () => {
    const { state, setBoardParameters } = useGameContext()
    const { n, m } = state.boardParameters
    const numberings = resolveAxisNumberings(state.boardParameters)
    const frameSettings = state.boardParameters.axisNumberingFrame ?? {}

    const handleFrameChange = useCallback((nextFrame: BoardAxisNumberingFrameSettings) => {
        setBoardParameters({
            ...state.boardParameters,
            axisNumberingFrame: nextFrame,
        })
    }, [setBoardParameters, state.boardParameters])

    const handleChange = useCallback((nextNumberings: BoardAxisNumbering[]) => {
        setBoardParameters(setAxisNumberings(state.boardParameters, nextNumberings))
    }, [setBoardParameters, state.boardParameters])

    const handleItemChange = useCallback((newItemValue: BoardAxisNumbering, index: number) => {
        const next = [...numberings]
        next[index] = normalizeAxisNumberingForBoard(newItemValue, n, m)
        handleChange(next)
    }, [numberings, handleChange, n, m])

    const handleItemRemove = useCallback((index: number) => {
        const next = [...numberings]
        next.splice(index, 1)
        handleChange(next)
    }, [numberings, handleChange])

    const handleItemUp = useCallback((index: number) => {
        if (index < numberings.length - 1) {
            const next = [...numberings]
            const temp = next[index]
            next[index] = next[index + 1]
            next[index + 1] = temp
            handleChange(next)
        }
    }, [numberings, handleChange])

    const handleItemDown = useCallback((index: number) => {
        if (index > 0) {
            const next = [...numberings]
            const temp = next[index]
            next[index] = next[index - 1]
            next[index - 1] = temp
            handleChange(next)
        }
    }, [numberings, handleChange])

    const handleAddNumbering = useCallback(() => {
        handleChange([...numberings, createDefaultAxisNumbering()])
    }, [numberings, handleChange])

    return (
        <div className={cn(ruleStyles.root, styles.axisNumberingsForm)}>
            <Form1<BoardAxisNumberingFrameSettings>
                className={styles.boardParametersForm}
                fieldLayout="labeled"
                value={frameSettings}
                config={createAxisNumberingFrameFormConfig}
                onChange={handleFrameChange}
            />
            <div className={ruleStyles.toolbar}>
                <button type="button" onClick={handleAddNumbering}>+ numbering</button>
            </div>
            <div className={ruleStyles.array}>
                {numberings.map((item, index) => (
                    <FormItem<BoardAxisNumbering>
                        key={index}
                        itemFormClassName={styles.axisNumberingItemForm}
                        fieldLayout="labeled"
                        className={ruleStyles.item}
                        index={index}
                        value={item}
                        config={(value) => numberingItemConfig(value, n, m)}
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
