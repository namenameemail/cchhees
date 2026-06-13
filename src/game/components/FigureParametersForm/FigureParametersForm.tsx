import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, moveRuleRepeat, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { FigureId, FigureMoveRule, FigureViewParams } from '../../types/figures'
import { FigureSVG } from '../FigureSVG'
import { FormArray } from '../../../components/FormArray'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import { ProjectFontSelect } from '../../../projects/components/ProjectFontSelect'
import {
    isSvgManualHeight,
    isSvgManualWidth,
    normalizeSvgCellParams,
} from '../../cellSvgSize'
import {
    getDefaultFigureViewParams,
    resolveFigureDefinition,
    resolveFigureState,
    resolveFigureViewParams,
} from '../../figureView'
import { isFigureTextShadowEnabled } from '../../figureTextShadow'
import styles from './styles.module.css'

const FontAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    return (
        <ProjectFontSelect
            name={name}
            value={typeof value === 'number' ? value : null}
            placeholder="font"
            title="font"
            onChange={(assetId) => onChange(name, assetId)}
        />
    )
}

const ImageAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const hasAsset = typeof value === 'number'

    return (
        <div className={styles.imageAssetField}>
            <ProjectImageSelect
                name={name}
                value={hasAsset ? value : null}
                placeholder="image asset"
                title="image asset"
                onChange={(assetId) => onChange(name, assetId)}
            />
            {hasAsset && (
                <button
                    type="button"
                    className={styles.clearImageAsset}
                    title="Удалить изображение"
                    onClick={() => onChange(name, null)}
                >
                    ×
                </button>
            )}
        </div>
    )
}

const SvgManualDimensionCheckbox: FC<ParameterInputComponentProps> = ({ name, value, onChange, props }) => {
    const checked = value !== false

    return (
        <label className={styles.svgManualCheckbox}>
            <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(name, !checked)}
            />
            <span>{props?.text || name}</span>
        </label>
    )
}

const figureParametersConfig: Form1FieldConfig<FigureViewParams>[] = [
    {
        name: 'assetId',
        Component: ImageAssetSelectField,
    },
    {
        name: 'manualWidth',
        Component: SvgManualDimensionCheckbox,
        props: { text: 'width' },
    },
    {
        name: 'width',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'width %', ...nonNegative },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isSvgManualWidth(state),
        }),
    },
    {
        name: 'manualHeight',
        Component: SvgManualDimensionCheckbox,
        props: { text: 'height' },
    },
    {
        name: 'height',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'height %', ...nonNegative },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isSvgManualHeight(state),
        }),
    },
    {
        name: 'borderRadius',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'border radius', ...nonNegative },
    },
    {
        name: 'strokeWidth',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'strokeWidth', ...nonNegative },
    },
    {
        name: 'strokeColor',
        type: ParameterTypes.ColorInput,
        props: { placeholder: 'strokeColor' },
    },
    {
        name: 'strokeDasharray',
        type: ParameterTypes.TextInput,
        props: { placeholder: 'strokeDasharray' },
    },
    {
        name: 'symbol',
        type: ParameterTypes.TextInput,
        props: { placeholder: 'symbol' },
    },
    {
        name: 'fontSize',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'font size', ...atLeastOne },
    },
    {
        name: 'fontAssetId',
        Component: FontAssetSelectField,
    },
    {
        name: 'color',
        type: ParameterTypes.ColorInput,
        props: { placeholder: 'color', label: 'color' },
    },
    {
        name: 'textShadowEnabled',
        Component: SvgManualDimensionCheckbox,
        props: { text: 'text shadow' },
    },
    {
        name: 'textShadowColor',
        type: ParameterTypes.ColorInput,
        props: { placeholder: 'shadow color', label: 'shadow color' },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
    {
        name: 'textShadowOffsetX',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'shadow x' },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
    {
        name: 'textShadowOffsetY',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'shadow y' },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
    {
        name: 'textShadowBlur',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'shadow blur', ...nonNegative },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
]

const moveRuleItemConfig = [
    {
        name: 'x',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'x' },
    },
    {
        name: 'y',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'y' },
    },
    {
        name: 'n',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'n', title: '0 = ∞', ...moveRuleRepeat },
    },
]

export interface FigureParametersFormBaseProps {
    className?: string
    figureId: FigureId
    value: FigureViewParams
    onChange: (value: FigureViewParams) => void
}

export const FigureParametersFormBase: FC<FigureParametersFormBaseProps> = ({
    figureId,
    value,
    onChange,
    className,
}) => {
    const handleChange = useCallback((nextValue: FigureViewParams) => {
        onChange(normalizeSvgCellParams({
            ...getDefaultFigureViewParams(figureId),
            ...nextValue,
            assetId: typeof nextValue.assetId === 'number' ? nextValue.assetId : null,
            fontAssetId: typeof nextValue.fontAssetId === 'number' ? nextValue.fontAssetId : null,
        }))
    }, [figureId, onChange])

    return (
        <Form1
            className={className}
            config={figureParametersConfig}
            value={value}
            onChange={handleChange}
        />
    )
}

export const FigureParametersForm: FC = () => {
    const {
        activeFigure,
        state,
        setFigureStateViewParams,
        setFigureStateMoveRules,
        addFigureState,
        removeFigureState,
    } = useGameContext()

    const [activeStateIndex, setActiveStateIndex] = useState(0)

    const figureDefinition = useMemo(() => {
        if (!activeFigure) {
            return null
        }

        return resolveFigureDefinition(activeFigure, state.figureCatalog)
    }, [activeFigure, state.figureCatalog])

    const stateCount = figureDefinition?.states.length ?? 1

    useEffect(() => {
        setActiveStateIndex(0)
    }, [activeFigure])

    useEffect(() => {
        if (activeStateIndex >= stateCount) {
            setActiveStateIndex(Math.max(0, stateCount - 1))
        }
    }, [activeStateIndex, stateCount])

    const activeFigureState = useMemo(() => {
        if (!figureDefinition) {
            return null
        }

        return resolveFigureState(figureDefinition, activeStateIndex)
    }, [figureDefinition, activeStateIndex])

    const viewParams = useMemo(() => {
        if (!activeFigure) {
            return getDefaultFigureViewParams()
        }

        return resolveFigureViewParams(activeFigure, state.figureCatalog, activeStateIndex)
    }, [activeFigure, state.figureCatalog, activeStateIndex])

    const moveRules = useMemo(() => {
        return activeFigureState?.moveRules ?? []
    }, [activeFigureState])

    const jumpOverPieces = activeFigureState?.jumpOverPieces === true

    const handleChange = useCallback((nextValue: FigureViewParams) => {
        if (!activeFigure) {
            return
        }
        setFigureStateViewParams(activeFigure, activeStateIndex, nextValue)
    }, [activeFigure, activeStateIndex, setFigureStateViewParams])

    const handleMoveRulesChange = useCallback((nextRules: FigureMoveRule[]) => {
        if (!activeFigure) {
            return
        }

        setFigureStateMoveRules(activeFigure, activeStateIndex, nextRules, jumpOverPieces)
    }, [activeFigure, activeStateIndex, jumpOverPieces, setFigureStateMoveRules])

    const handleJumpOverPiecesChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeFigure) {
            return
        }

        setFigureStateMoveRules(activeFigure, activeStateIndex, moveRules, event.target.checked)
    }, [activeFigure, activeStateIndex, moveRules, setFigureStateMoveRules])

    const handleAddState = useCallback(() => {
        if (!activeFigure) {
            return
        }

        addFigureState(activeFigure)
        setActiveStateIndex(stateCount)
    }, [activeFigure, addFigureState, stateCount])

    const handleRemoveState = useCallback(() => {
        if (!activeFigure || activeStateIndex <= 0 || stateCount <= 1) {
            return
        }

        removeFigureState(activeFigure, activeStateIndex)
        setActiveStateIndex(index => Math.max(0, index - 1))
    }, [activeFigure, activeStateIndex, stateCount, removeFigureState])

    const getMoveRuleInitialValue = useCallback((): FigureMoveRule => ({
        x: 1,
        y: 0,
        n: 1,
    }), [])

    if (!activeFigure) {
        return (
            <div className={styles.hint}>
                Выберите фигуру выше, чтобы настроить её внешний вид
            </div>
        )
    }

    return (
        <div className={styles.figureParametersFormLayout}>
            <div className={styles.topRow}>
                <div>figure: {activeFigure}</div>
            </div>
            <div className={styles.stateRow}>
                <span className={styles.stateRowLabel}>state</span>
                <div className={styles.stateTabs}>
                    {figureDefinition?.states.map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            className={index === activeStateIndex ? styles.stateTabActive : styles.stateTab}
                            onClick={() => setActiveStateIndex(index)}
                        >
                            {index}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={styles.stateTabAdd}
                        title="Добавить состояние"
                        onClick={handleAddState}
                    >
                        +
                    </button>
                    {activeStateIndex > 0 && stateCount > 1 && (
                        <button
                            type="button"
                            className={styles.stateTabRemove}
                            title="Удалить состояние"
                            onClick={handleRemoveState}
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.secondRow}>
                <FigureParametersFormBase
                    className={styles.figureParametersForm}
                    figureId={activeFigure}
                    value={viewParams}
                    onChange={handleChange}
                />
                <FigureSVG
                    figureId={activeFigure}
                    highlighted
                    stateIndex={activeStateIndex}
                />
            </div>
            <div
                className={styles.moveRulesSection}
                title="Пустой список — свободное перемещение. n по умолчанию 1; 0 — бесконечно по лучу."
            >
                <div className={styles.moveRulesHeader}>
                    <span className={styles.moveRulesTitle}>Ходы</span>
                    <label className={styles.jumpOverPiecesField}>
                        <input
                            type="checkbox"
                            checked={jumpOverPieces}
                            onChange={handleJumpOverPiecesChange}
                        />
                        <span>через фигуры</span>
                    </label>
                </div>
                <FormArray<FigureMoveRule>
                    className={styles.moveRulesArray}
                    itemClassName={styles.moveRuleItem}
                    itemFormClassName={styles.moveRuleItemForm}
                    addButtonClassName={styles.moveRulesAddRow}
                    value={moveRules}
                    itemConfig={moveRuleItemConfig}
                    onChange={handleMoveRulesChange}
                    getItemInitialValue={getMoveRuleInitialValue}
                    addText="+"
                />
            </div>
        </div>
    )
}
