import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, integerStep, moveRuleRepeat, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { FigureId, FigureMoveRule, FigureViewParams, FigureCatalog } from '../../types/figures'
import {
    FigureEventRule,
    FigureEventType,
    GameAction,
    GameActionTarget,
    GameActionType,
    StepCause,
} from '../../types/events'
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
    normalizeFigureEventRule,
    resolveFigureDefinition,
    resolveFigureState,
    resolveFigureViewParams,
} from '../../figureView'
import { isFigureTextShadowEnabled } from '../../figureTextShadow'
import styles from './styles.module.css'

type FigureSectionTab = 'view' | 'moves' | 'events'

const FIGURE_SECTION_TABS: Array<{ id: FigureSectionTab; label: string }> = [
    { id: 'view', label: 'вид' },
    { id: 'moves', label: 'ходы' },
    { id: 'events', label: 'события' },
]

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

const figureEventTypeOptions = Object.values(FigureEventType)
const gameActionTypeOptions = Object.values(GameActionType)
const gameActionTargetOptions = Object.values<GameActionTarget>([
    'steppedOn',
    'steppedBy',
    'areaAnchor',
])
const stepCauseOptions: StepCause[] = ['any', 'manual', 'displacement']
const stepperFigureOptions = (figureOptions: FigureId[]) => ['', ...figureOptions]
const boundaryActionTypeOptions = [
    GameActionType.moveToTray,
    GameActionType.displaceFigure,
]

function isBoundaryEventType(type: FigureEventType): boolean {
    return type === FigureEventType.leaveBoard
}

const eventNumberInputProps = {
    pointerLock: false,
    changeOnBlur: true,
    resetOnBlur: false,
} as const

function getStepperStateCount(catalog: FigureCatalog, stepperFigureId?: FigureId): number {
    if (!stepperFigureId) {
        return 1
    }

    return catalog.find(entry => entry.id === stepperFigureId)?.states.length ?? 1
}

function getTargetStateCount(catalog: FigureCatalog, targetFigureId?: FigureId): number {
    if (!targetFigureId) {
        return 1
    }

    return catalog.find(entry => entry.id === targetFigureId)?.states.length ?? 1
}

function getEventParamsConfig(
    type: FigureEventType,
    figureOptions: FigureId[],
    catalog: FigureCatalog,
) {
    switch (type) {
        case FigureEventType.steppedOnBy:
            return [
                {
                    name: 'stepperFigureId',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stepperFigureOptions(figureOptions),
                        title: 'stepper (пусто = любой)',
                    },
                },
                {
                    name: 'stepperStateIndex',
                    type: ParameterTypes.NumberInput,
                    props: { placeholder: 'stepper state', ...nonNegative, ...eventNumberInputProps },
                    visibility: (params: { stepperFigureId?: FigureId }) => (
                        getStepperStateCount(catalog, params?.stepperFigureId) > 1
                    ),
                },
                {
                    name: 'cause',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stepCauseOptions,
                        title: 'cause',
                    },
                },
            ]
        case FigureEventType.stepOnFigure:
            return [
                {
                    name: 'targetFigureId',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stepperFigureOptions(figureOptions),
                        title: 'target (пусто = любая)',
                    },
                },
                {
                    name: 'targetStateIndex',
                    type: ParameterTypes.NumberInput,
                    props: { placeholder: 'target state', ...nonNegative, ...eventNumberInputProps },
                    visibility: (params: { targetFigureId?: FigureId }) => (
                        getTargetStateCount(catalog, params?.targetFigureId) > 1
                    ),
                },
                {
                    name: 'cause',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stepCauseOptions,
                        title: 'cause',
                    },
                },
            ]
        case FigureEventType.enterCell:
        case FigureEventType.leaveCell:
            return [
                { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne, ...eventNumberInputProps } },
            ]
        case FigureEventType.enterRect:
            return [
                { name: 'x1', type: ParameterTypes.NumberInput, props: { placeholder: 'x1', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y1', type: ParameterTypes.NumberInput, props: { placeholder: 'y1', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'x2', type: ParameterTypes.NumberInput, props: { placeholder: 'x2', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y2', type: ParameterTypes.NumberInput, props: { placeholder: 'y2', ...atLeastOne, ...eventNumberInputProps } },
            ]
        case FigureEventType.enterFigureArea:
            return [
                {
                    name: 'figureId',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: figureOptions,
                        title: 'figure',
                    },
                },
                { name: 'halfWidth', type: ParameterTypes.NumberInput, props: { placeholder: 'half w', ...nonNegative, ...eventNumberInputProps } },
                { name: 'halfHeight', type: ParameterTypes.NumberInput, props: { placeholder: 'half h', ...nonNegative, ...eventNumberInputProps } },
            ]
        default:
            return []
    }
}

function getActionParamsConfig(type: GameActionType, figureOptions: FigureId[]) {
    switch (type) {
        case GameActionType.moveToTray:
            return []
        case GameActionType.displaceFigure:
            return [
                { name: 'dx', type: ParameterTypes.NumberInput, props: { placeholder: 'dx', ...integerStep, ...eventNumberInputProps } },
                { name: 'dy', type: ParameterTypes.NumberInput, props: { placeholder: 'dy', ...integerStep, ...eventNumberInputProps } },
            ]
        case GameActionType.spawnFigure:
            return [
                {
                    name: 'figureId',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: figureOptions,
                        title: 'figure',
                    },
                },
                { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'stateIndex', type: ParameterTypes.NumberInput, props: { placeholder: 'state', ...nonNegative, ...eventNumberInputProps } },
            ]
        case GameActionType.setSelfState:
            return [
                { name: 'stateIndex', type: ParameterTypes.NumberInput, props: { placeholder: 'state', ...nonNegative, ...eventNumberInputProps } },
            ]
        case GameActionType.setOtherState:
            return [
                { name: 'stateIndex', type: ParameterTypes.NumberInput, props: { placeholder: 'state', ...nonNegative, ...eventNumberInputProps } },
                {
                    name: 'target',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: gameActionTargetOptions,
                        title: 'target',
                    },
                },
            ]
        default:
            return []
    }
}

function createEventActionsArrayProps(
    figureOptions: FigureId[],
    defaultAction: GameActionType = GameActionType.setSelfState,
    actionTypeOptions: GameActionType[] = gameActionTypeOptions,
) {
    const getDefaultActionParams = () => {
        switch (defaultAction) {
            case GameActionType.moveToTray:
                return {}
            case GameActionType.displaceFigure:
                return { dx: 1, dy: 0 }
            default:
                return { stateIndex: 0 }
        }
    }

    return {
        className: styles.eventActionsArray,
        itemClassName: styles.eventActionItem,
        itemFormClassName: styles.eventActionItemForm,
        addButtonClassName: styles.eventActionsAddRow,
        itemConfig: (item: GameAction) => {
            const paramsConfig = getActionParamsConfig(item.type, figureOptions)
            const fields: Form1FieldConfig<GameAction>[] = [
                {
                    name: 'type',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: actionTypeOptions,
                        title: 'action',
                    },
                },
            ]

            if (paramsConfig.length > 0) {
                fields.push({
                    name: 'params',
                    type: ParameterTypes.Form1,
                    props: {
                        className: styles.eventParamsForm,
                        config: paramsConfig,
                    },
                })
            }

            return fields
        },
        getItemInitialValue: (): GameAction => ({
            type: defaultAction,
            params: getDefaultActionParams() as GameAction['params'],
        }),
    }
}

function getEventRuleEventFields(
    rule: FigureEventRule,
    figureOptions: FigureId[],
    catalog: FigureCatalog,
): Form1FieldConfig<FigureEventRule>[] {
    const paramsConfig = getEventParamsConfig(rule.type, figureOptions, catalog)
    const fields: Form1FieldConfig<FigureEventRule>[] = [
        {
            name: 'type',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.eventTypeSelect,
                options: figureEventTypeOptions,
                title: 'event',
            },
        },
    ]

    if (paramsConfig.length > 0) {
        fields.push({
            name: 'params',
            type: ParameterTypes.Form1,
            props: {
                className: styles.eventParamsForm,
                config: paramsConfig,
            },
        })
    }

    return fields
}

function getEventRuleActionsArrayProps(
    rule: FigureEventRule,
    figureOptions: FigureId[],
) {
    const isBoundaryEvent = isBoundaryEventType(rule.type)
    const defaultAction = isBoundaryEvent
        ? GameActionType.moveToTray
        : GameActionType.setSelfState
    const actionOptions = isBoundaryEvent
        ? boundaryActionTypeOptions
        : gameActionTypeOptions

    return createEventActionsArrayProps(figureOptions, defaultAction, actionOptions)
}

interface EventRuleRowProps {
    rule: FigureEventRule
    index: number
    figureOptions: FigureId[]
    catalog: FigureCatalog
    onChange: (rule: FigureEventRule, index: number) => void
    onRemove: (index: number) => void
}

const EventRuleRow: FC<EventRuleRowProps> = ({
    rule,
    index,
    figureOptions,
    catalog,
    onChange,
    onRemove,
}) => {
    const eventFields = useMemo(
        () => getEventRuleEventFields(rule, figureOptions, catalog),
        [rule, figureOptions, catalog],
    )

    const actionsArrayProps = useMemo(
        () => getEventRuleActionsArrayProps(rule, figureOptions),
        [rule, figureOptions],
    )

    const handleRuleChange = useCallback((nextRule: FigureEventRule) => {
        onChange(nextRule, index)
    }, [index, onChange])

    const handleActionsChange = useCallback((actions: GameAction[]) => {
        onChange({ ...rule, actions }, index)
    }, [rule, index, onChange])

    const handleRemove = useCallback(() => {
        onRemove(index)
    }, [index, onRemove])

    return (
        <div className={styles.eventRuleRow}>
            <div className={styles.eventRuleEventCol}>
                <Form1
                    className={styles.eventEventFieldsForm}
                    value={rule}
                    config={eventFields}
                    onChange={handleRuleChange}
                />
                <button
                    type="button"
                    className={styles.eventRuleRemove}
                    title="Удалить событие"
                    onClick={handleRemove}
                >
                    x
                </button>
            </div>
            <div className={styles.eventRuleActionsCol}>
                <FormArray<GameAction>
                    {...actionsArrayProps}
                    value={rule.actions}
                    onChange={handleActionsChange}
                />
            </div>
        </div>
    )
}

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
        setFigureEventRules,
        addFigureState,
        removeFigureState,
    } = useGameContext()

    const [activeStateIndex, setActiveStateIndex] = useState(0)
    const [activeSection, setActiveSection] = useState<FigureSectionTab>('view')

    const figureDefinition = useMemo(() => {
        if (!activeFigure) {
            return null
        }

        return resolveFigureDefinition(activeFigure, state.figureCatalog)
    }, [activeFigure, state.figureCatalog])

    const stateCount = figureDefinition?.states.length ?? 1

    useEffect(() => {
        setActiveStateIndex(0)
        setActiveSection('view')
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

    const figureOptions = useMemo(() => {
        return state.figureCatalog.map(entry => entry.id)
    }, [state.figureCatalog])

    const eventRules = useMemo(() => {
        if (!activeFigure) {
            return []
        }

        return state.figureCatalog.find(entry => entry.id === activeFigure)?.eventRules ?? []
    }, [activeFigure, state.figureCatalog])

    const getEventRuleInitialValue = useCallback((): FigureEventRule => ({
        id: crypto.randomUUID(),
        type: FigureEventType.stepOnFigure,
        actions: [{
            type: GameActionType.setSelfState,
            params: { stateIndex: 0 },
        }],
    }), [])

    const handleEventRulesChange = useCallback((nextRules: FigureEventRule[]) => {
        if (!activeFigure) {
            return
        }

        const patched = nextRules.map(rule => {
            if (rule.type === FigureEventType.steppedOnBy) {
                const params = (rule.params ?? {}) as {
                    stepperFigureId?: FigureId
                    stepperStateIndex?: number
                    cause?: StepCause
                }

                return {
                    ...rule,
                    params: {
                        cause: params.cause ?? 'any',
                        ...(params.stepperFigureId ? { stepperFigureId: params.stepperFigureId } : {}),
                        ...(params.stepperStateIndex !== undefined
                            ? { stepperStateIndex: params.stepperStateIndex }
                            : {}),
                    },
                    actions: rule.actions?.length
                        ? rule.actions
                        : [{ type: GameActionType.moveToTray, params: {} }],
                }
            }

            if (rule.type === FigureEventType.leaveBoard) {
                return {
                    ...rule,
                    actions: rule.actions?.length
                        ? rule.actions
                        : [{ type: GameActionType.moveToTray, params: {} }],
                }
            }

            if (rule.type === FigureEventType.stepOnFigure) {
                const params = (rule.params ?? {}) as {
                    targetFigureId?: FigureId
                    targetStateIndex?: number
                    cause?: StepCause
                }

                return {
                    ...rule,
                    params: {
                        cause: params.cause ?? 'any',
                        ...(params.targetFigureId ? { targetFigureId: params.targetFigureId } : {}),
                        ...(params.targetStateIndex !== undefined
                            ? { targetStateIndex: params.targetStateIndex }
                            : {}),
                    },
                }
            }

            return rule
        })

        setFigureEventRules(activeFigure, patched.map(rule => normalizeFigureEventRule(rule) ?? rule))
    }, [activeFigure, setFigureEventRules])

    const handleEventRuleChange = useCallback((rule: FigureEventRule, index: number) => {
        const nextRules = [...eventRules]
        nextRules[index] = rule
        handleEventRulesChange(nextRules)
    }, [eventRules, handleEventRulesChange])

    const handleEventRuleRemove = useCallback((index: number) => {
        const nextRules = [...eventRules]
        nextRules.splice(index, 1)
        handleEventRulesChange(nextRules)
    }, [eventRules, handleEventRulesChange])

    const handleAddEventRule = useCallback(() => {
        handleEventRulesChange([...eventRules, getEventRuleInitialValue()])
    }, [eventRules, handleEventRulesChange, getEventRuleInitialValue])

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
            {activeSection !== 'events' && (
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
            )}
            <div className={styles.sectionTabsRow}>
                {FIGURE_SECTION_TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={activeSection === tab.id ? styles.sectionTabActive : styles.sectionTab}
                        onClick={() => setActiveSection(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeSection === 'view' && (
                <div className={styles.sectionPanel}>
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
                </div>
            )}
            {activeSection === 'moves' && (
                <div
                    className={styles.sectionPanel}
                    title="Пустой список — свободное перемещение. n по умолчанию 1; 0 — бесконечно по лучу."
                >
                    <div className={styles.moveRulesSection}>
                        <div className={styles.moveRulesHeader}>
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
            )}
            {activeSection === 'events' && (
                <div
                    className={styles.sectionPanel}
                    title="События срабатывают при ходе в режиме игры. Действия применяются после базового перемещения."
                >
                    <div className={styles.eventRulesSection}>
                        <div className={styles.eventRulesTableHeader}>
                            <span>Событие</span>
                            <span>Действия</span>
                        </div>
                        <div className={styles.eventRulesArray}>
                            {eventRules.map((rule, index) => (
                                <EventRuleRow
                                    key={rule.id}
                                    rule={rule}
                                    index={index}
                                    figureOptions={figureOptions}
                                    catalog={state.figureCatalog}
                                    onChange={handleEventRuleChange}
                                    onRemove={handleEventRuleRemove}
                                />
                            ))}
                            <div className={styles.eventRulesAddRow}>
                                <button type="button" onClick={handleAddEventRule}>+</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
