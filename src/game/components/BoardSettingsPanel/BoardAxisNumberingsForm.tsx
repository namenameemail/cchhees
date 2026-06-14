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
        <div className={styles.fullWidth}>
            <div className={styles.backgroundAssetField}>
                <ProjectImageSelect
                    name={name}
                    value={hasAsset ? value : null}
                    placeholder="фон"
                    title="фон"
                    onChange={(assetId) => onChange(name, assetId)}
                />
                {hasAsset && (
                    <button
                        type="button"
                        className={styles.clearBackgroundImage}
                        title="Сбросить изображение"
                        onClick={() => onChange(name, null)}
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
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
        { name: 'orientation', Component: OrientationSelectField },
        { name: 'edge', Component: createEdgeSelectField(item) },
        { name: 'order', Component: OrderSelectField },
        { name: 'format', Component: FormatSelectField },
        {
            name: 'skipCellsStart',
            type: ParameterTypes.NumberInput,
            props: {
                placeholder: item.orientation === 'horizontal' ? 'пропуск столбцов (нач.)' : 'пропуск строк (нач.)',
                ...nonNegative,
                ...integerStep,
                max: maxSkipStart,
            },
        },
        {
            name: 'skipCellsEnd',
            type: ParameterTypes.NumberInput,
            props: {
                placeholder: item.orientation === 'horizontal' ? 'пропуск столбцов (кон.)' : 'пропуск строк (кон.)',
                ...nonNegative,
                ...integerStep,
                max: maxSkipEnd,
            },
        },
        {
            name: 'numberOffset',
            type: ParameterTypes.NumberInput,
            props: { placeholder: '+ к начальному числу', ...integerStep },
        },
        {
            name: 'edgeInsetCells',
            type: ParameterTypes.NumberInput,
            props: {
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
            type: ParameterTypes.NumberInput,
            props: { placeholder: stripPlaceholder, ...atLeastOne },
        },
        {
            name: 'fontSize',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'font size', ...atLeastOne },
        },
        {
            name: 'color',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'color', className: styles.fullWidth },
        },
        { name: 'fontAssetId', Component: FontAssetSelectField },
        {
            name: 'offsetX',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'offset X' },
        },
        {
            name: 'offsetY',
            type: ParameterTypes.NumberInput,
            props: { placeholder: 'offset Y' },
        },
        { name: 'align', Component: AlignSelectField },
        { name: 'gutterAlign', Component: GutterAlignSelectField },
        {
            name: 'background',
            type: ParameterTypes.ColorInput,
            props: { placeholder: 'фон', className: styles.fullWidth },
        },
        { name: 'backgroundAssetId', Component: BackgroundAssetSelectField },
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
            <div className={styles.axisNumberingFrameSection}>
                <div className={styles.axisNumberingFrameTitle}>общий фон</div>
                <Form1<BoardAxisNumberingFrameSettings>
                    className={styles.axisNumberingFrameForm}
                    value={frameSettings}
                    config={createAxisNumberingFrameFormConfig}
                    onChange={handleFrameChange}
                />
            </div>
            <div className={ruleStyles.toolbar}>
                <button type="button" onClick={handleAddNumbering}>+ numbering</button>
            </div>
            <div className={ruleStyles.array}>
                {numberings.map((item, index) => (
                    <FormItem<BoardAxisNumbering>
                        key={index}
                        itemFormClassName={cn(ruleStyles.itemForm, styles.axisNumberingItemForm)}
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
