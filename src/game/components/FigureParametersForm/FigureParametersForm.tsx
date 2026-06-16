import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, integerStep, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { FigureId, FigureMoveRule, FigureViewParams } from '../../types/figures'
import {
    FigureEventRule,
    FigureEventType,
    GameAction,
    GameActionTarget,
    GameActionType,
    DisplaceFigureActionParams,
    SetOtherStateActionParams,
    SpawnFigureActionParams,
    StepCause,
    StackPositionMode,
    StackTargetMode,
} from '../../types/events'
import { FigureSVG } from '../FigureSVG'
import {
    createFigureFilterArrayFieldConfig,
    createFigureStateFieldConfig,
} from '../FigureStateSelect/FigureStateSelectField'
import { createFigureAreaGridFieldConfig } from '../FigureAreaGrid/FigureAreaGridField'
import { FIGURE_FILTER_ANY, canonicalizeFigureFilterArray } from '../../figureFilter'
import { FigureMoveRulesGrid } from '../FigureMoveRulesGrid/FigureMoveRulesGrid'
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
    normalizeFigureEventParamsAreaEnteredBy,
    normalizeFigureEventParamsEnterFigureArea,
    normalizeFigureEventRule,
    normalizeGameAction,
    resolveFigureDefinition,
    resolveFigureState,
    resolveFigureViewParams,
} from '../../figureView'
import {
    logFigureEventActionsChange,
    logFigureEventRulesBatchChange,
    logFigureEventRulesDebug,
} from '../../figureEventRulesDebugLog'
import { setProfilerPanelChannel } from '../../../profiler'
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

const figureEventTypeOptions = Object.values(FigureEventType)
const gameActionTypeOptions = Object.values(GameActionType)
const gameActionTargetOptions = Object.values<GameActionTarget>([
    'steppedOn',
    'steppedBy',
    'areaAnchor',
])
const VALID_ACTION_TARGETS = new Set<GameActionTarget>(gameActionTargetOptions)
const stepCauseOptions: StepCause[] = ['any', 'manual', 'displacement']
const stackPositionOptions: StackPositionMode[] = ['any', 'top', 'bottom', 'fromTop', 'fromBottom']
const stackTargetOptions: StackTargetMode[] = ['all', 'top', 'bottom', 'fromTop', 'fromBottom']
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

function getEventParamsConfig(
    type: FigureEventType,
    ownerFigureId?: FigureId,
) {
    switch (type) {
        case FigureEventType.steppedOnBy:
            return [
                createFigureFilterArrayFieldConfig('stepperFigures', {
                    allowAny: true,
                    title: 'stepper (любая = ?)',
                    className: styles.figureFilterArray,
                    itemClassName: styles.figureFilterArrayItem,
                }),
                {
                    name: 'cause',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stepCauseOptions,
                        title: 'cause',
                    },
                },
                {
                    name: 'stackPosition',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stackPositionOptions,
                        title: 'stack position',
                    },
                },
                {
                    name: 'stackIndex',
                    type: ParameterTypes.NumberInput,
                    props: { placeholder: 'stack index', ...nonNegative, ...integerStep, ...eventNumberInputProps },
                },
            ]
        case FigureEventType.stepOnFigure:
            return [
                createFigureFilterArrayFieldConfig('targetFigures', {
                    allowAny: true,
                    title: 'target (любая = ?)',
                    className: styles.figureFilterArray,
                    itemClassName: styles.figureFilterArrayItem,
                }),
                {
                    name: 'cause',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stepCauseOptions,
                        title: 'cause',
                    },
                },
                {
                    name: 'stackTarget',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stackTargetOptions,
                        title: 'stack target',
                    },
                },
                {
                    name: 'stackIndex',
                    type: ParameterTypes.NumberInput,
                    props: { placeholder: 'stack index', ...nonNegative, ...integerStep, ...eventNumberInputProps },
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
                createFigureFilterArrayFieldConfig('anchorFigures', {
                    allowAny: true,
                    title: 'anchor (любая = ?)',
                    className: styles.figureFilterArray,
                    itemClassName: styles.figureFilterArrayItem,
                }),
                createFigureAreaGridFieldConfig('cells', {
                    className: styles.figureAreaGridField,
                }),
                {
                    name: 'includePassive',
                    Component: SvgManualDimensionCheckbox,
                    props: { text: 'триггер если стояла / вошли в область' },
                },
            ]
        case FigureEventType.areaEnteredBy:
            return [
                createFigureFilterArrayFieldConfig('entererFigures', {
                    allowAny: true,
                    title: 'enterer (любая = ?)',
                    className: styles.figureFilterArray,
                    itemClassName: styles.figureFilterArrayItem,
                }),
                createFigureAreaGridFieldConfig('cells', {
                    className: styles.figureAreaGridField,
                    previewFigureId: ownerFigureId,
                }),
                {
                    name: 'includePassive',
                    Component: SvgManualDimensionCheckbox,
                    props: { text: 'триггер если стояла / вошли в область' },
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
        default:
            return []
    }
}

function getActionParamsConfig(type: GameActionType) {
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
                createFigureStateFieldConfig('figureId', {
                    stateField: 'stateIndex',
                    showStatePicker: true,
                    title: 'figure',
                }),
                { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne, ...eventNumberInputProps } },
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

function sanitizeEventActions(
    actions: GameAction[],
    options: { defaultFigureId?: FigureId; figureOptions?: FigureId[] } = {},
): GameAction[] {
    const fallbackFigureId = options.defaultFigureId ?? options.figureOptions?.[0]

    return actions.map(action => {
        if (action.type === GameActionType.setOtherState) {
            const params = (action.params ?? { stateIndex: 0, target: 'steppedOn' }) as SetOtherStateActionParams

            return {
                type: action.type,
                params: {
                    stateIndex: Math.max(0, Math.trunc(params.stateIndex ?? 0)),
                    target: params.target && VALID_ACTION_TARGETS.has(params.target)
                        ? params.target
                        : 'steppedOn',
                },
            }
        }

        if (action.type === GameActionType.spawnFigure) {
            const params = (action.params ?? {}) as Partial<SpawnFigureActionParams>
            const figureId = typeof params.figureId === 'string' && params.figureId.trim()
                ? params.figureId.trim()
                : (fallbackFigureId ?? '')

            const rawX = params.x
            const rawY = params.y
            const x = rawX !== undefined && Number.isFinite(rawX) && Math.trunc(rawX) >= 1
                ? Math.trunc(rawX)
                : 1
            const y = rawY !== undefined && Number.isFinite(rawY) && Math.trunc(rawY) >= 1
                ? Math.trunc(rawY)
                : 1

            return {
                type: action.type,
                params: {
                    figureId,
                    x,
                    y,
                    stateIndex: params.stateIndex === undefined
                        ? 0
                        : Math.max(0, Math.trunc(params.stateIndex)),
                },
            }
        }

        if (action.type === GameActionType.displaceFigure) {
            const params = (action.params ?? {}) as Partial<DisplaceFigureActionParams>
            let dx = Number.isFinite(params.dx) ? Math.trunc(params.dx!) : 1
            let dy = Number.isFinite(params.dy) ? Math.trunc(params.dy!) : 0

            if (dx === 0 && dy === 0) {
                dx = 1
                dy = 0
            }

            return {
                type: action.type,
                params: { dx, dy },
            }
        }

        return action
    })
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
            case GameActionType.setOtherState:
                return { stateIndex: 0, target: 'steppedOn' as GameActionTarget }
            case GameActionType.spawnFigure:
                return {
                    figureId: figureOptions[0] ?? '',
                    x: 1,
                    y: 1,
                    stateIndex: 0,
                }
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
            const paramsConfig = getActionParamsConfig(item.type)
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
    ownerFigureId?: FigureId,
): Form1FieldConfig<FigureEventRule>[] {
    const paramsConfig = getEventParamsConfig(rule.type, ownerFigureId)
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
    figureId?: FigureId
    figureOptions: FigureId[]
    onChange: (rule: FigureEventRule, index: number) => void
    onRemove: (index: number) => void
}

const EventRuleRow: FC<EventRuleRowProps> = ({
    rule,
    index,
    figureId,
    figureOptions,
    onChange,
    onRemove,
}) => {
    const eventFields = useMemo(
        () => getEventRuleEventFields(rule, figureId),
        [rule, figureId],
    )

    const actionsArrayProps = useMemo(
        () => getEventRuleActionsArrayProps(rule, figureOptions),
        [rule, figureOptions],
    )

    const handleRuleChange = useCallback((nextRule: FigureEventRule) => {
        logFigureEventRulesDebug('rule-change', {
            figureId,
            ruleId: rule.id,
            ruleIndex: index,
            before: { type: rule.type, params: rule.params, actions: rule.actions },
            after: { type: nextRule.type, params: nextRule.params, actions: nextRule.actions },
        })
        onChange(nextRule, index)
    }, [figureId, index, onChange, rule])

    const handleActionsChange = useCallback((actions: GameAction[]) => {
        const sanitized = sanitizeEventActions(actions, {
            defaultFigureId: figureId,
            figureOptions,
        })

        logFigureEventActionsChange({
            figureId,
            rule,
            ruleIndex: index,
            before: rule.actions,
            after: sanitized,
        })

        onChange({ ...rule, actions: sanitized }, index)
    }, [figureId, figureOptions, rule, index, onChange])

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

    useEffect(() => {
        if (import.meta.env.DEV) {
            setProfilerPanelChannel(activeSection === 'events' ? 'gameplay' : 'scroll')
        }
    }, [activeSection])

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
        params: {
            targetFigures: [{ figureId: FIGURE_FILTER_ANY }],
            cause: 'any',
        },
        actions: [{
            type: GameActionType.setSelfState,
            params: { stateIndex: 0 },
        }],
    }), [])

    const handleEventRulesChange = useCallback((nextRules: FigureEventRule[]) => {
        if (!activeFigure) {
            return
        }

        logFigureEventRulesBatchChange({
            figureId: activeFigure,
            phase: 'before-normalize',
            rules: nextRules,
        })

        const patched = nextRules.map(rule => {
            if (rule.type === FigureEventType.steppedOnBy) {
                const params = rule.params as {
                    stepperFigures?: Array<{ figureId?: FigureId; stateIndex?: number }>
                    cause?: StepCause
                    stackPosition?: StackPositionMode
                    stackIndex?: number
                } | undefined

                return {
                    ...rule,
                    params: {
                        cause: params?.cause ?? 'any',
                        stepperFigures: canonicalizeFigureFilterArray(params?.stepperFigures),
                        stackPosition: params?.stackPosition ?? 'any',
                        ...(params?.stackIndex !== undefined ? { stackIndex: params.stackIndex } : {}),
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
                const params = rule.params as {
                    targetFigures?: Array<{ figureId?: FigureId; stateIndex?: number }>
                    cause?: StepCause
                    stackTarget?: StackTargetMode
                    stackIndex?: number
                } | undefined

                return {
                    ...rule,
                    params: {
                        cause: params?.cause ?? 'any',
                        targetFigures: canonicalizeFigureFilterArray(params?.targetFigures),
                        stackTarget: params?.stackTarget ?? 'all',
                        ...(params?.stackIndex !== undefined ? { stackIndex: params.stackIndex } : {}),
                    },
                }
            }

            if (rule.type === FigureEventType.enterFigureArea) {
                return {
                    ...rule,
                    params: normalizeFigureEventParamsEnterFigureArea(
                        rule.params as Parameters<typeof normalizeFigureEventParamsEnterFigureArea>[0],
                    ),
                }
            }

            if (rule.type === FigureEventType.areaEnteredBy) {
                return {
                    ...rule,
                    params: normalizeFigureEventParamsAreaEnteredBy(
                        rule.params as Parameters<typeof normalizeFigureEventParamsAreaEnteredBy>[0],
                    ),
                }
            }

            return rule
        })

        const normalizeDropped: Array<{ ruleId: string; index: number; reason: string }> = []

        const saved = patched.map((rule, index) => {
            const normalized = normalizeFigureEventRule(rule)

            if (!normalized) {
                const actionResults = (rule.actions ?? []).map(action => ({
                    type: action.type,
                    params: action.params,
                    normalized: normalizeGameAction(action),
                }))

                normalizeDropped.push({
                    ruleId: rule.id,
                    index,
                    reason: actionResults.every(result => result.normalized == null)
                        ? 'all actions rejected by normalizeGameAction'
                        : 'normalizeFigureEventRule returned null',
                })

                logFigureEventRulesDebug('normalize-rejected', {
                    figureId: activeFigure,
                    ruleId: rule.id,
                    ruleIndex: index,
                    before: rule,
                    detail: { actionResults },
                })

                return rule
            }

            return normalized
        })

        logFigureEventRulesBatchChange({
            figureId: activeFigure,
            phase: 'after-save',
            rules: saved,
            normalizeDropped: normalizeDropped.length > 0 ? normalizeDropped : undefined,
        })

        setFigureEventRules(activeFigure, saved)
    }, [activeFigure, setFigureEventRules])

    const handleEventRuleChange = useCallback((rule: FigureEventRule, index: number) => {
        const nextRules = [...eventRules]
        nextRules[index] = rule
        handleEventRulesChange(nextRules)
    }, [eventRules, handleEventRulesChange])

    const handleEventRuleRemove = useCallback((index: number) => {
        logFigureEventRulesDebug('rule-remove', {
            figureId: activeFigure,
            ruleId: eventRules[index]?.id,
            ruleIndex: index,
            before: eventRules[index],
        })
        const nextRules = [...eventRules]
        nextRules.splice(index, 1)
        handleEventRulesChange(nextRules)
    }, [activeFigure, eventRules, handleEventRulesChange])

    const handleAddEventRule = useCallback(() => {
        const nextRule = getEventRuleInitialValue()
        logFigureEventRulesDebug('rule-add', {
            figureId: activeFigure,
            ruleId: nextRule.id,
            after: nextRule,
        })
        handleEventRulesChange([...eventRules, nextRule])
    }, [activeFigure, eventRules, handleEventRulesChange, getEventRuleInitialValue])

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
                        <FigureMoveRulesGrid
                            figureId={activeFigure}
                            stateIndex={activeStateIndex}
                            moveRules={moveRules}
                            onChange={handleMoveRulesChange}
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
                                    figureId={activeFigure}
                                    figureOptions={figureOptions}
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
