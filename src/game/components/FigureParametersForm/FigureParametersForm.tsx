import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import { NumberDragPointerLockInput } from 'bbuutoonnss'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import form1Styles from '../../../components/Form1/styles.module.css'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, integerStep, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { FigureId, FigureMoveRule, FigureViewParams } from '../../types/figures'
import {
    FigureEventCondition,
    FigureEventConditionType,
    FigureEventRule,
    FigureEventType,
    GameAction,
    GameActionType,
    FigureEventParamsOnMove,
    FigureEventParamsSteppedOnBy,
    SpawnFigureActionParams,
    StepCause,
    StackPositionMode,
    StackTargetMode,
} from '../../types/events'
import { ScalableFigurePreview } from '../ScalableFigurePreview'
import {
    createConditionSubjectFieldConfig,
    createFigureFilterArrayFieldConfig,
    createFigureStateFieldConfig,
} from '../FigureStateSelect/FigureStateSelectField'
import { createFigureAreaGridFieldConfig } from '../FigureAreaGrid/FigureAreaGridField'
import { FIGURE_FILTER_ANY, FIGURE_SUBJECT_MOVED, FIGURE_SUBJECT_STEPPED_ON } from '../../figureFilter'
import { FigureMoveRulesGrid } from '../FigureMoveRulesGrid/FigureMoveRulesGrid'
import { removeRule, getRuleAt } from '../FigureMoveRulesGrid/moveRulesGrid'
import { MoveRuleVariantsPanel, updateMoveRuleAt } from '../MoveRuleVariantsPanel/MoveRuleVariantsPanel'
import { createEventConditionsArrayProps } from '../eventConditionsForm'
import { resolveTeamSelectOptions } from '../../figureTeams'
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
import { isFigureTextShadowEnabled } from '../../figureTextShadow'
import styles from './styles.module.css'

type FigureSectionTab = 'view' | 'moves'

const FIGURE_SECTION_TABS: Array<{ id: FigureSectionTab; label: string }> = [
    { id: 'view', label: 'вид' },
    { id: 'moves', label: 'ходы' },
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

const FigureAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const hasAsset = typeof value === 'number'

    return (
        <ProjectImageSelect
            name={name}
            value={hasAsset ? value : null}
            placeholder="image"
            title="image"
            clearable
            onChange={(assetId) => onChange(name, assetId)}
        />
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

type SvgDimension = 'width' | 'height'

const svgDimensionMeta: Record<SvgDimension, {
    manualKey: 'manualWidth' | 'manualHeight'
    placeholder: string
    isManual: (state: FigureViewParams) => boolean
}> = {
    width: {
        manualKey: 'manualWidth',
        placeholder: 'width %',
        isManual: isSvgManualWidth,
    },
    height: {
        manualKey: 'manualHeight',
        placeholder: 'height %',
        isManual: isSvgManualHeight,
    },
}

const SvgDimensionField: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    props,
    formState,
    onFieldsChange,
}) => {
    const dimension = props?.dimension as SvgDimension
    const { manualKey, placeholder, isManual } = svgDimensionMeta[dimension]
    const manual = isManual(formState ?? {})
    const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : 0

    const handleToggle = () => {
        const next = !manual
        if (onFieldsChange) {
            onFieldsChange({ [manualKey]: next })
        } else {
            onChange(manualKey, next)
        }
    }

    const handleChange = useCallback((nextValue: number) => {
        onChange(name, nextValue)
    }, [onChange, name])

    return (
        <div className={styles.dimensionField}>
            <input
                type="checkbox"
                className={styles.dimensionCheckbox}
                checked={manual}
                onChange={handleToggle}
            />
            <NumberDragPointerLockInput
                value={numericValue}
                onChange={handleChange}
                min={props?.min}
                max={props?.max}
                step={props?.step}
                direction={props?.direction}
                dragPixelsPerStep={props?.dragPixelsPerStep}
                pointerLock={props?.pointerLock ?? true}
                placeholder={placeholder}
                title={placeholder}
                disabled={!manual}
                changeOnBlur={props?.changeOnBlur ?? true}
                changeOnChange={props?.changeOnChange ?? true}
                changeOnEnter={props?.changeOnEnter ?? true}
                resetOnBlur={props?.resetOnBlur ?? false}
                className={form1Styles.fieldInput}
            />
        </div>
    )
}

const figureParametersConfig: Form1FieldConfig<FigureViewParams>[] = [
    {
        name: 'assetId',
        label: 'img',
        Component: FigureAssetSelectField,
    },
    {
        name: 'width',
        label: 'w',
        Component: SvgDimensionField,
        props: { dimension: 'width', ...nonNegative },
    },
    {
        name: 'height',
        label: 'h',
        Component: SvgDimensionField,
        props: { dimension: 'height', ...nonNegative },
    },
    {
        name: 'borderRadius',
        label: 'r',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'border radius', ...nonNegative },
    },
    {
        name: 'strokeWidth',
        label: 'sw',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'strokeWidth', ...nonNegative },
    },
    {
        name: 'strokeColor',
        label: 'sc',
        type: ParameterTypes.ColorInput,
        props: { placeholder: 'strokeColor' },
    },
    {
        name: 'strokeDasharray',
        label: 'ds',
        type: ParameterTypes.TextInput,
        props: { placeholder: 'strokeDasharray' },
    },
    {
        name: 'symbol',
        label: 'sym',
        type: ParameterTypes.TextInput,
        props: { placeholder: 'symbol' },
    },
    {
        name: 'fontSize',
        label: 'fs',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'font size', ...atLeastOne },
    },
    {
        name: 'fontAssetId',
        label: 'fn',
        Component: FontAssetSelectField,
    },
    {
        name: 'color',
        label: 'fg',
        type: ParameterTypes.ColorInput,
        props: { title: 'color', placeholder: 'color' },
    },
    {
        name: 'textShadowEnabled',
        label: 'ts',
        Component: SvgManualDimensionCheckbox,
        props: { text: 'text shadow' },
    },
    {
        name: 'textShadowColor',
        label: 'sh',
        type: ParameterTypes.ColorInput,
        props: { title: 'shadow color', placeholder: 'shadow color' },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
    {
        name: 'textShadowOffsetX',
        label: 'sx',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'shadow x' },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
    {
        name: 'textShadowOffsetY',
        label: 'sy',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'shadow y' },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
    {
        name: 'textShadowBlur',
        label: 'sb',
        type: ParameterTypes.NumberInput,
        props: { placeholder: 'shadow blur', ...nonNegative },
        propsByState: (state: FigureViewParams) => ({
            disabled: !isFigureTextShadowEnabled(state),
        }),
    },
]

const figureEventTypeOptions = Object.values(FigureEventType)
const figureEventConditionTypeOptions = Object.values(FigureEventConditionType)

const conditionMatchModeOptions = ['any', 'all'] as const
const gameActionTypeOptions = Object.values(GameActionType).filter(
    type => type !== GameActionType.setOtherState,
)

const gameActionTypeLabels: Record<GameActionType, string> = {
    [GameActionType.setSelfState]: 'сменить состояние на',
    [GameActionType.setOtherState]: 'сменить состояние на',
    [GameActionType.moveToCell]: 'переместить на (xy)',
    [GameActionType.displaceFigure]: 'переместить на (dx,dy)',
    [GameActionType.moveToTray]: 'убрать в трей',
    [GameActionType.spawnFigure]: 'создать фигуру',
}

function defaultActionSubject(eventType: FigureEventType): GameAction['subject'] {
    const entries = eventType === FigureEventType.steppedOnBy
        ? [{ figureId: FIGURE_SUBJECT_STEPPED_ON }]
        : [{ figureId: FIGURE_SUBJECT_MOVED }]

    return { entries, matchMode: 'any' }
}
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

function getEventParamsConfig(type: FigureEventType) {
    switch (type) {
        case FigureEventType.onMove:
            return [{
                name: 'cause',
                type: ParameterTypes.SelectArray,
                props: {
                    className: styles.eventTypeSelect,
                    options: stepCauseOptions,
                },
            }]
        case FigureEventType.steppedOnBy:
            return [
                {
                    name: 'cause',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stepCauseOptions,
                    },
                },
                {
                    name: 'stackPosition',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: styles.eventTypeSelect,
                        options: stackPositionOptions,
                    },
                },
                {
                    name: 'stackIndex',
                    type: ParameterTypes.NumberInput,
                    props: { placeholder: 'stack index', ...nonNegative, ...integerStep, ...eventNumberInputProps },
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
        case GameActionType.moveToCell:
            return [
                { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne, ...eventNumberInputProps } },
            ]
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

        return action
    })
}

function createEventActionsArrayProps(
    figureOptions: FigureId[],
    eventType: FigureEventType,
    defaultAction: GameActionType = GameActionType.setSelfState,
    actionTypeOptions: GameActionType[] = gameActionTypeOptions,
) {
    const getDefaultActionParams = () => {
        switch (defaultAction) {
            case GameActionType.moveToTray:
                return {}
            case GameActionType.moveToCell:
                return { x: 1, y: 1 }
            case GameActionType.displaceFigure:
                return { dx: 1, dy: 0 }
            case GameActionType.setOtherState:
                return { stateIndex: 0 }
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

    const getDefaultSubject = (): GameAction['subject'] | undefined => (
        defaultAction === GameActionType.spawnFigure
            ? undefined
            : defaultActionSubject(eventType)
    )

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
                        optionLabels: gameActionTypeLabels,
                    },
                },
            ]

            if (item.type !== GameActionType.spawnFigure) {
                fields.push({
                    name: 'subject',
                    type: ParameterTypes.Form1,
                    props: {
                        className: styles.eventParamsForm,
                        config: [
                            createConditionSubjectFieldConfig({
                            }) as unknown as Form1FieldConfig<NonNullable<GameAction['subject']>>,
                            {
                                name: 'matchMode',
                                type: ParameterTypes.SelectArray,
                                props: {
                                    className: styles.eventTypeSelect,
                                    options: conditionMatchModeOptions,
                                },
                                visibility: (subject) => (subject.entries?.length ?? 0) > 1,
                            },
                        ],
                    },
                })
            }

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
            ...(getDefaultSubject() ? { subject: getDefaultSubject() } : {}),
            params: getDefaultActionParams() as GameAction['params'],
        }),
    }
}

function getEventRuleEventFields(
    rule: FigureEventRule,
): Form1FieldConfig<FigureEventRule>[] {
    const paramsConfig = getEventParamsConfig(rule.type)
    const fields: Form1FieldConfig<FigureEventRule>[] = [
        {
            name: 'type',
            type: ParameterTypes.SelectArray,
            props: {
                className: styles.eventTypeSelect,
                options: figureEventTypeOptions,
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

    return createEventActionsArrayProps(figureOptions, rule.type, defaultAction, actionOptions)
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
        () => getEventRuleEventFields(rule),
        [rule],
    )

    const conditionsArrayProps = useMemo(
        () => createEventConditionsArrayProps(figureId),
        [figureId],
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

    const handleConditionsChange = useCallback((conditions: FigureEventCondition[]) => {
        logFigureEventRulesDebug('conditions-change', {
            figureId,
            ruleId: rule.id,
            ruleIndex: index,
            before: rule.conditions,
            after: conditions,
        })

        onChange({ ...rule, conditions }, index)
    }, [figureId, index, onChange, rule])

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
                    onClick={handleRemove}
                >
                    x
                </button>
            </div>
            <div className={styles.eventRuleConditionsCol}>
                <FormArray<FigureEventCondition>
                    {...conditionsArrayProps}
                    value={rule.conditions ?? []}
                    onChange={handleConditionsChange}
                />
            </div>
            <div className={styles.eventRuleActionsCol}>
                <FormArray<GameAction>
                    {...actionsArrayProps}
                    value={rule.actions ?? []}
                    onChange={handleActionsChange}
                />
            </div>
        </div>
    )
}

export function createDefaultEventRule(): FigureEventRule {
    return {
        id: crypto.randomUUID(),
        type: FigureEventType.onMove,
        params: { cause: 'any' },
        conditions: [{
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            type: FigureEventConditionType.landedOnFigure,
            params: {
                figures: [{ figureId: FIGURE_FILTER_ANY }],
                matchMode: 'any',
                stackTarget: 'all',
            },
        }],
        actions: [{
            type: GameActionType.setSelfState,
            params: { stateIndex: 0 },
        }],
    }
}

function patchEventRules(nextRules: FigureEventRule[]): FigureEventRule[] {
    return nextRules.map(rule => {
        if (rule.type === FigureEventType.steppedOnBy) {
            const params = (rule.params ?? {}) as FigureEventParamsSteppedOnBy

            return {
                ...rule,
                params: {
                    cause: params.cause ?? 'any',
                    stackPosition: params.stackPosition ?? 'any',
                    ...(params.stackIndex !== undefined ? { stackIndex: params.stackIndex } : {}),
                },
                conditions: rule.conditions ?? [],
                actions: rule.actions ?? [],
            }
        }

        if (rule.type === FigureEventType.leaveBoard) {
            return {
                ...rule,
                conditions: rule.conditions ?? [],
                actions: rule.actions ?? [],
            }
        }

        if (rule.type === FigureEventType.onMove) {
            const params = (rule.params ?? {}) as FigureEventParamsOnMove

            return {
                ...rule,
                params: { cause: params.cause ?? 'any' },
                conditions: rule.conditions ?? [],
                actions: rule.actions ?? [],
            }
        }

        return {
            ...rule,
            conditions: rule.conditions ?? [],
            actions: rule.actions ?? [],
        }
    })
}

export function normalizeEventRulesForSave(
    nextRules: FigureEventRule[],
    debugContext?: { figureId?: FigureId },
): FigureEventRule[] {
    const patched = patchEventRules(nextRules)
    const normalizeDropped: Array<{ ruleId: string; index: number; reason: string }> = []

    const saved = patched.map((rule, index) => {
        const normalized = normalizeFigureEventRule(rule, {
            figureId: debugContext?.figureId,
            ruleIndex: index,
        })

        if (!normalized) {
            const actionResults = (rule.actions ?? []).map(action => ({
                type: action.type,
                params: action.params,
                normalized: normalizeGameAction(action, { eventType: rule.type }),
            }))

            normalizeDropped.push({
                ruleId: rule.id,
                index,
                reason: actionResults.every(result => result.normalized == null)
                    ? 'all actions rejected by normalizeGameAction'
                    : 'normalizeFigureEventRule returned null',
            })

            logFigureEventRulesDebug('normalize-rejected', {
                figureId: debugContext?.figureId,
                ruleId: rule.id,
                ruleIndex: index,
                before: rule,
                detail: { actionResults },
            })

            return rule
        }

        return normalized
    })

    if (normalizeDropped.length > 0) {
        logFigureEventRulesBatchChange({
            figureId: debugContext?.figureId,
            phase: 'after-save',
            rules: saved,
            normalizeDropped,
        })
    }

    return saved
}

export interface EventRulesTableProps {
    eventRules: FigureEventRule[]
    figureOptions: FigureId[]
    onChange: (rules: FigureEventRule[]) => void
}

export const EventRulesTable: FC<EventRulesTableProps> = ({
    eventRules,
    figureOptions,
    onChange,
}) => {
    const handleEventRulesChange = useCallback((nextRules: FigureEventRule[]) => {
        logFigureEventRulesBatchChange({
            phase: 'before-normalize',
            rules: nextRules,
        })
        onChange(normalizeEventRulesForSave(nextRules))
    }, [onChange])

    const handleEventRuleChange = useCallback((rule: FigureEventRule, index: number) => {
        const nextRules = [...eventRules]
        nextRules[index] = rule
        handleEventRulesChange(nextRules)
    }, [eventRules, handleEventRulesChange])

    const handleEventRuleRemove = useCallback((index: number) => {
        logFigureEventRulesDebug('rule-remove', {
            ruleId: eventRules[index]?.id,
            ruleIndex: index,
            before: eventRules[index],
        })
        const nextRules = [...eventRules]
        nextRules.splice(index, 1)
        handleEventRulesChange(nextRules)
    }, [eventRules, handleEventRulesChange])

    const handleAddEventRule = useCallback(() => {
        const nextRule = createDefaultEventRule()
        logFigureEventRulesDebug('rule-add', {
            ruleId: nextRule.id,
            after: nextRule,
        })
        handleEventRulesChange([...eventRules, nextRule])
    }, [eventRules, handleEventRulesChange])

    return (
        <div className={styles.eventRulesSection}>
            <div className={styles.eventRulesTableHeader}>
                <span>Событие</span>
                <span>Условия</span>
                <span>Действия</span>
            </div>
            <div className={styles.eventRulesArray}>
                {eventRules.map((rule, index) => (
                    <EventRuleRow
                        key={rule.id}
                        rule={rule}
                        index={index}
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
            fieldLayout="labeledColumn"
            config={figureParametersConfig}
            value={value}
            onChange={handleChange}
        />
    )
}

export const FigureParametersForm: FC = () => {
    const {
        activeFigure,
        getFigureStateIndex,
        setFigureStateIndex,
        state,
        setFigureStateViewParams,
        setFigureStateMoveRules,
        addFigureState,
        removeFigureState,
        setFigureTeam,
        figureTeams,
    } = useGameContext()

    const [activeSection, setActiveSection] = useState<FigureSectionTab>('view')
    const [selectedMoveOffset, setSelectedMoveOffset] = useState<{ x: number; y: number } | null>(null)

    const activeStateIndex = activeFigure != null ? getFigureStateIndex(activeFigure) : 0

    const setActiveStateIndex = useCallback((index: number | ((prev: number) => number)) => {
        if (!activeFigure) {
            return
        }

        const next = typeof index === 'function'
            ? index(getFigureStateIndex(activeFigure))
            : index

        setFigureStateIndex(activeFigure, next)
    }, [activeFigure, getFigureStateIndex, setFigureStateIndex])

    const figureDefinition = useMemo(() => {
        if (!activeFigure) {
            return null
        }

        return resolveFigureDefinition(activeFigure, state.figureCatalog)
    }, [activeFigure, state.figureCatalog])

    const stateCount = figureDefinition?.states.length ?? 1
    const { cellXDistance, cellYDistance } = state.boardParameters
    const figureCellAspect = cellYDistance > 0 ? cellXDistance / cellYDistance : 1
    const layoutStyle = {
        '--figure-cell-aspect': figureCellAspect,
    } as React.CSSProperties

    useEffect(() => {
        setSelectedMoveOffset(null)
    }, [activeFigure, activeStateIndex])

    useEffect(() => {
        if (!activeFigure || activeStateIndex < stateCount) {
            return
        }

        setFigureStateIndex(activeFigure, Math.max(0, stateCount - 1))
    }, [activeFigure, activeStateIndex, stateCount, setFigureStateIndex])

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

    const handleChange = useCallback((nextValue: FigureViewParams) => {
        if (!activeFigure) {
            return
        }
        setFigureStateViewParams(activeFigure, activeStateIndex, nextValue)
    }, [activeFigure, activeStateIndex, setFigureStateViewParams])

    const selectedMoveRule = useMemo(() => {
        if (!selectedMoveOffset) {
            return null
        }

        return getRuleAt(moveRules, selectedMoveOffset.x, selectedMoveOffset.y) ?? null
    }, [moveRules, selectedMoveOffset])

    const handleMoveRulesChange = useCallback((nextRules: FigureMoveRule[]) => {
        if (!activeFigure) {
            return
        }

        setFigureStateMoveRules(activeFigure, activeStateIndex, nextRules)
    }, [activeFigure, activeStateIndex, setFigureStateMoveRules])

    const handleSelectedMoveRuleChange = useCallback((nextRule: FigureMoveRule) => {
        handleMoveRulesChange(updateMoveRuleAt(moveRules, nextRule))
    }, [handleMoveRulesChange, moveRules])

    const handleRemoveSelectedMoveRule = useCallback(() => {
        if (!selectedMoveOffset) {
            return
        }

        handleMoveRulesChange(removeRule(moveRules, selectedMoveOffset.x, selectedMoveOffset.y))
        setSelectedMoveOffset(null)
    }, [handleMoveRulesChange, moveRules, selectedMoveOffset])

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

    const handleTeamChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        if (!activeFigure) {
            return
        }

        const raw = event.target.value

        if (!raw) {
            setFigureTeam(activeFigure, undefined)
            return
        }

        const parsed = Number(raw)

        if (Number.isFinite(parsed)) {
            setFigureTeam(activeFigure, Math.trunc(parsed))
        }
    }, [activeFigure, setFigureTeam])

    const teamSelectOptions = useMemo(
        () => resolveTeamSelectOptions(figureTeams, state.figureCatalog, figureDefinition?.team),
        [figureTeams, state.figureCatalog, figureDefinition?.team],
    )

    if (!activeFigure) {
        return null
    }

    const teamRow = (
        <div className={styles.teamRow}>
            <span className={styles.stateRowLabel}>команда</span>
            <select
                className={styles.teamSelect}
                value={figureDefinition?.team ?? ''}
                onChange={handleTeamChange}
            >
                <option value="">—</option>
                {teamSelectOptions.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                ))}
            </select>
        </div>
    )

    const stateTabs = (
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
    )

    return (
        <div className={styles.figureParametersFormLayout} style={layoutStyle}>
            {teamRow}
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
            <div className={styles.sectionPanelsScroll}>
                {activeSection === 'view' && (
                    <div className={cn(styles.sectionPanel, styles.viewSectionPanel)}>
                        {stateTabs}
                        <div className={styles.viewContent}>
                            <div className={styles.viewColumnLeft}>
                                <FigureParametersFormBase
                                    className={styles.figureParametersForm}
                                    figureId={activeFigure}
                                    value={viewParams}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className={styles.viewColumnRight}>
                                <div className={styles.preview}>
                                    <ScalableFigurePreview
                                        figureId={activeFigure}
                                        stateIndex={activeStateIndex}
                                        svgClassName={styles.previewSvg}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeSection === 'moves' && (
                    <div
                        className={styles.sectionPanel}
                        title="Пустой список — свободное перемещение. n по умолчанию 1; 0 — бесконечно по лучу."
                    >
                        {stateTabs}
                        <div className={styles.moveRulesSection}>
                            <FigureMoveRulesGrid
                                figureId={activeFigure}
                                stateIndex={activeStateIndex}
                                moveRules={moveRules}
                                selectedOffset={selectedMoveOffset}
                                onChange={handleMoveRulesChange}
                                onSelect={setSelectedMoveOffset}
                            />
                            <MoveRuleVariantsPanel
                                figureId={activeFigure}
                                rule={selectedMoveRule}
                                onChange={handleSelectedMoveRuleChange}
                                onRemove={handleRemoveSelectedMoveRule}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
