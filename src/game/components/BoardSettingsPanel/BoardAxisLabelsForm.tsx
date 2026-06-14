import React, { FC, useCallback } from 'react'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, integerStep } from '../../../components/Form1/numberInputConstraints'
import {
    AXIS_LABEL_ALIGN_LABELS,
    AXIS_LABEL_ALIGN_OPTIONS,
    AXIS_LABEL_FORMAT_OPTIONS,
    AXIS_LABEL_GUTTER_ALIGN_LABELS,
    AXIS_LABEL_GUTTER_ALIGN_OPTIONS,
    AXIS_LABEL_SIDE_LABELS,
    AXIS_LABEL_SIDE_OPTIONS,
    AxisLabelAlign,
    AxisLabelFormat,
    AxisLabelGutterAlign,
    AxisLabelSide,
    BoardAxisLabelsSettings,
    BoardAxisSideSettings,
} from '../../types/boardParameters'
import { normalizeAxisLabelsSettings, resolveAxisLabelsSettings } from '../../boardAxisLabels'
import { ProjectFontSelect } from '../../../projects/components/ProjectFontSelect'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import styles from './styles.module.css'

function isHorizontalSide(side: AxisLabelSide): boolean {
    return side === 'top' || side === 'bottom'
}

const FORMAT_LABELS: Record<AxisLabelFormat, string> = {
    digit: 'цифры',
    letter: 'буквы',
    roman: 'римские',
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
            title="положение в полосе подписей"
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

const axisSideSettingsConfig = [
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
    {
        name: 'fontAssetId',
        Component: FontAssetSelectField,
    },
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
    {
        name: 'align',
        Component: AlignSelectField,
    },
    {
        name: 'gutterAlign',
        Component: GutterAlignSelectField,
    },
    {
        name: 'background',
        type: ParameterTypes.ColorInput,
        props: { placeholder: 'фон', className: styles.fullWidth },
    },
    {
        name: 'backgroundAssetId',
        Component: BackgroundAssetSelectField,
    },
]

const createAxisHorizontalBlockConfig = (maxStartCell: number) => [
    {
        name: 'blockHeight',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'толщина полосы (px)', ...atLeastOne },
    },
    {
        name: 'blockStartCell',
        type: ParameterTypes.NumberInput,
        props: {
            placeholder: 'с столбца №',
            ...atLeastOne,
            ...integerStep,
            max: maxStartCell,
        },
    },
    {
        name: 'blockSpanPercent',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'ширина блока (%)', ...atLeastOne },
    },
]

const createAxisVerticalBlockConfig = (maxStartCell: number) => [
    {
        name: 'blockWidth',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'толщина полосы (px)', ...atLeastOne },
    },
    {
        name: 'blockStartCell',
        type: ParameterTypes.NumberInput,
        props: {
            placeholder: 'со строки №',
            ...atLeastOne,
            ...integerStep,
            max: maxStartCell,
        },
    },
    {
        name: 'blockSpanPercent',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'высота блока (%)', ...atLeastOne },
    },
]

interface AxisSideBlockSettingsProps {
    side: AxisLabelSide
    settings: BoardAxisSideSettings
    maxStartCell: number
    onChange: (patch: Partial<BoardAxisSideSettings>) => void
}

const AxisSideBlockSettings: FC<AxisSideBlockSettingsProps> = ({
    side,
    settings,
    maxStartCell,
    onChange,
}) => {
    const blockConfig = isHorizontalSide(side)
        ? createAxisHorizontalBlockConfig(maxStartCell)
        : createAxisVerticalBlockConfig(maxStartCell)
    const blockValue = {
        ...settings,
        blockStartCell: settings.blockStartCell ?? 1,
        blockSpanPercent: settings.blockSpanPercent ?? 100,
    }

    return (
        <div className={styles.axisSideBlockSettings}>
            <Form1<BoardAxisSideSettings>
                className={styles.axisSideFontForm}
                value={blockValue}
                config={blockConfig}
                onChange={onChange}
            />
            <label className={styles.axisSpanRefRow}>
                <input
                    type="checkbox"
                    checked={settings.blockSpanIncludeGutters !== false}
                    onChange={() => onChange({
                        blockSpanIncludeGutters: settings.blockSpanIncludeGutters === false,
                    })}
                />
                <span>100% с полосами нумерации</span>
            </label>
        </div>
    )
}

export const BoardAxisLabelsForm: FC = () => {
    const { state, setBoardParameters } = useGameContext()
    const axisLabels = resolveAxisLabelsSettings(state.boardParameters)

    const updateAxisLabels = useCallback((nextAxisLabels: BoardAxisLabelsSettings) => {
        const { showAxisLabels: _legacy, ...rest } = state.boardParameters

        setBoardParameters({
            ...rest,
            axisLabels: normalizeAxisLabelsSettings(nextAxisLabels),
        })
    }, [setBoardParameters, state.boardParameters])

    const updateSide = useCallback((
        side: AxisLabelSide,
        patch: Partial<BoardAxisSideSettings>,
    ) => {
        updateAxisLabels({
            ...axisLabels,
            [side]: {
                ...axisLabels[side],
                ...patch,
            },
        })
    }, [axisLabels, updateAxisLabels])

    return (
        <div className={styles.axisLabelsForm}>
            {AXIS_LABEL_SIDE_OPTIONS.map(side => (
                <div key={side} className={styles.axisSideBlock}>
                    <div className={styles.axisSideRow}>
                        <label className={styles.axisSideEnable}>
                            <input
                                type="checkbox"
                                checked={axisLabels[side].enabled}
                                onChange={() => updateSide(side, { enabled: !axisLabels[side].enabled })}
                            />
                            <span>{AXIS_LABEL_SIDE_LABELS[side]}</span>
                        </label>
                        <select
                            className={styles.axisSideFormat}
                            value={axisLabels[side].format}
                            disabled={!axisLabels[side].enabled}
                            title="Формат подписей"
                            onChange={event => updateSide(side, {
                                format: event.target.value as AxisLabelFormat,
                            })}
                        >
                            {AXIS_LABEL_FORMAT_OPTIONS.map(format => (
                                <option key={format} value={format}>
                                    {FORMAT_LABELS[format]}
                                </option>
                            ))}
                        </select>
                    </div>
                    {axisLabels[side].enabled && (
                        <>
                            <Form1<BoardAxisSideSettings>
                                className={styles.axisSideFontForm}
                                value={axisLabels[side]}
                                config={axisSideSettingsConfig}
                                onChange={patch => updateSide(side, patch)}
                            />
                            <AxisSideBlockSettings
                                side={side}
                                settings={axisLabels[side]}
                                maxStartCell={isHorizontalSide(side) ? state.boardParameters.n : state.boardParameters.m}
                                onChange={patch => updateSide(side, patch)}
                            />
                        </>
                    )}
                </div>
            ))}
        </div>
    )
}
