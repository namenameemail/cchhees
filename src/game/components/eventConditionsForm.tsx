import React, { FC } from 'react'
import { ParameterInputComponentProps } from '../../components/Form1'
import { Form1FieldConfig } from '../../components/Form1/types'
import { ParameterTypes } from '../../components/Form1/types'
import { atLeastOne } from '../../components/Form1/numberInputConstraints'
import { FigureId } from '../types/figures'
import { FigureEventCondition, FigureEventConditionParams, FigureEventConditionType } from '../types/events'
import {
    ConditionContext,
    getConditionTypesForContext,
} from '../events/conditions/conditionContexts'
import {
    createConditionSubjectWithMatchModeFieldConfig,
    createFigureFilterArrayFieldConfig,
    createFigureFilterArrayWithMatchModeFieldConfig,
} from './FigureStateSelect/FigureStateSelectField'
import { createFigureAreaGridFieldConfig } from './FigureAreaGrid/FigureAreaGridField'
import { createDxDyAreaGridFieldConfig } from './FigureAreaGrid/DxDyAreaGridField'
import { createTeamOrientFieldConfig } from './TeamOrientCheckbox'
import { FIGURE_FILTER_ANY, FIGURE_SUBJECT_MOVED } from '../figureFilter'
import formStyles from './FigureParametersForm/styles.module.css'

const figureEventConditionTypeLabels: Record<FigureEventConditionType, string> = {
    [FigureEventConditionType.inBoardArea]: 'находится в области доски',
    [FigureEventConditionType.inFigureArea]: 'находится в области фигуры',
    [FigureEventConditionType.movedBy]: 'сдвинулась на',
    [FigureEventConditionType.isFigure]: 'является',
    [FigureEventConditionType.isNotFigure]: 'не является',
    [FigureEventConditionType.exitedBoard]: 'вышла за границу доски',
    [FigureEventConditionType.hoppedOverFigures]: 'перепрыгнула фигуры',
    [FigureEventConditionType.hasFigureInArea]: 'имеет фигуру в области',
}

const movePhaseOptions = ['before', 'after', 'entered', 'left'] as const
const movePhaseOptionLabels: Record<typeof movePhaseOptions[number], string> = {
    before: 'до хода',
    after: 'после хода',
    entered: 'вошла',
    left: 'вышла',
}

const eventNumberInputProps = {
    pointerLock: false,
    changeOnBlur: true,
    resetOnBlur: false,
} as const

const ManualCheckbox: FC<ParameterInputComponentProps> = ({ name, value, onChange, props }) => {
    const checked = value !== false
    const text = (props as { text?: string } | undefined)?.text ?? ''

    return (
        <label className={formStyles.svgManualCheckbox}>
            <input
                type="checkbox"
                checked={checked}
                onChange={event => onChange(name, event.target.checked)}
            />
            <span>{text}</span>
        </label>
    )
}

/**
 * Смена типа условия должна атомарно сбросить params под новый тип
 * (иначе normalizeFigureEventConditionParams не распознает старую форму params
 * и вся строка условия молча дропнется при нормализации). Делаем это здесь,
 * в момент реального изменения, а не пост-фактум диффом всего массива условий —
 * такой дифф не может надёжно отличить "поменялся тип" от "отредактировали params".
 */
const ConditionTypeSelect: FC<ParameterInputComponentProps> = ({ name, value, onChange, onFieldsChange, props }) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextType = event.target.value as FigureEventConditionType

        if (onFieldsChange) {
            onFieldsChange({ type: nextType, params: getDefaultConditionParamsForType(nextType) })
            return
        }

        onChange(name, nextType)
    }

    return (
        <select
            className={props?.className}
            value={value}
            onChange={handleChange}
            title={props?.title}
        >
            {props?.options?.map((option: string) => (
                <option key={option} value={option}>
                    {props?.optionLabels?.[option] ?? option}
                </option>
            ))}
        </select>
    )
}

function getDefaultConditionParams(type: FigureEventConditionType): FigureEventConditionParams {
    switch (type) {
        case FigureEventConditionType.hoppedOverFigures:
        case FigureEventConditionType.hasFigureInArea:
            return { figures: [{ figureId: FIGURE_FILTER_ANY }], matchMode: 'any', movePhase: 'after' }
        case FigureEventConditionType.isFigure:
        case FigureEventConditionType.isNotFigure:
            return { figures: [{ figureId: FIGURE_FILTER_ANY }] }
        case FigureEventConditionType.movedBy:
            return { dx: 1, dy: 0 }
        case FigureEventConditionType.inBoardArea:
            return { x1: 1, y1: 1, x2: 1, y2: 1, movePhase: 'after' }
        case FigureEventConditionType.inFigureArea:
            return { includePassive: true, movePhase: 'after' }
        default:
            return {}
    }
}

export function getDefaultConditionParamsForType(type: FigureEventConditionType): FigureEventConditionParams {
    const defaults = getDefaultConditionParams(type)

    if (type === FigureEventConditionType.hasFigureInArea) {
        return {
            ...defaults,
            cells: [{ x: 0, y: 1 }],
            orientToTeamDirection: true,
        }
    }

    return defaults
}

function withTeamOrient(
    fields: Form1FieldConfig<Record<string, unknown>>[],
    title?: string,
): Form1FieldConfig<Record<string, unknown>>[] {
    return [createTeamOrientFieldConfig({ title }), ...fields]
}

function createMovePhaseFieldConfig(): Form1FieldConfig<Record<string, unknown>> {
    return {
        name: 'movePhase',
        type: ParameterTypes.SelectArray,
        props: {
            className: formStyles.eventTypeSelect,
            options: movePhaseOptions,
            optionLabels: movePhaseOptionLabels,
        },
    }
}

function withMovePhase(
    fields: Form1FieldConfig<Record<string, unknown>>[],
): Form1FieldConfig<Record<string, unknown>>[] {
    return [createMovePhaseFieldConfig(), ...fields]
}

function getConditionParamsConfig(
    type: FigureEventConditionType,
    ownerFigureId?: FigureId,
    context?: ConditionContext,
    params?: FigureEventCondition['params'],
) {
    switch (type) {
        case FigureEventConditionType.inBoardArea:
            return withMovePhase(withTeamOrient([
                { name: 'x1', type: ParameterTypes.NumberInput, props: { placeholder: 'x1', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y1', type: ParameterTypes.NumberInput, props: { placeholder: 'y1', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'x2', type: ParameterTypes.NumberInput, props: { placeholder: 'x2', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y2', type: ParameterTypes.NumberInput, props: { placeholder: 'y2', ...atLeastOne, ...eventNumberInputProps } },
            ]))
        case FigureEventConditionType.inFigureArea: {
            const movePhase = (params as { movePhase?: string } | undefined)?.movePhase ?? 'after'
            const showIncludePassive = movePhase === 'entered' || movePhase === 'left'
            return withMovePhase([
                createFigureFilterArrayFieldConfig('anchorFigures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
                createFigureAreaGridFieldConfig('cells', {
                    className: formStyles.figureAreaGridField,
                    previewFigureId: ownerFigureId,
                }),
                ...(showIncludePassive
                    ? [{
                        name: 'includePassive',
                        Component: ManualCheckbox,
                        props: { text: 'пассивный вход' },
                    }]
                    : []),
            ])
        }
        case FigureEventConditionType.hasFigureInArea:
            return withMovePhase([
                createFigureFilterArrayWithMatchModeFieldConfig('figures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
                createFigureAreaGridFieldConfig('cells', {
                    className: formStyles.figureAreaGridField,
                    previewFigureId: ownerFigureId,
                }),
            ])
        case FigureEventConditionType.hoppedOverFigures:
            return [
                createFigureFilterArrayWithMatchModeFieldConfig('figures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
            ]
        case FigureEventConditionType.movedBy:
            return [
                createDxDyAreaGridFieldConfig('dx', {
                    className: formStyles.figureAreaGridField,
                    previewFigureId: ownerFigureId,
                }),
            ]
        case FigureEventConditionType.isFigure:
        case FigureEventConditionType.isNotFigure:
            return [
                createFigureFilterArrayFieldConfig('figures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
            ]
        case FigureEventConditionType.exitedBoard:
            return []
        default:
            return []
    }
}

interface CreateConditionsArrayPropsOptions {
    ownerFigureId?: FigureId
    context: ConditionContext
}

function createConditionsArrayProps({ ownerFigureId, context }: CreateConditionsArrayPropsOptions) {
    const conditionTypeOptions = getConditionTypesForContext(context)

    return {
        className: formStyles.eventConditionsArray,
        itemClassName: formStyles.eventConditionItem,
        itemFormClassName: formStyles.eventConditionItemForm,
        addButtonClassName: formStyles.eventConditionsAddRow,
        addText: '+',
        addAtStart: true,
        itemConfig: (item: FigureEventCondition) => {
            const paramsConfig = getConditionParamsConfig(item.type, ownerFigureId, context, item.params)
            const restrictSubjectRoles = item.type === FigureEventConditionType.hasFigureInArea
            const fields: Form1FieldConfig<FigureEventCondition>[] = [
                {
                    name: 'type',
                    Component: ConditionTypeSelect,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: conditionTypeOptions,
                        optionLabels: figureEventConditionTypeLabels,
                    },
                },
                createConditionSubjectWithMatchModeFieldConfig({
                    ...(restrictSubjectRoles ? { allowedRoles: ['moved', 'steppedOn'] as const } : {}),
                }) as unknown as Form1FieldConfig<FigureEventCondition>,
            ]

            if (paramsConfig.length > 0) {
                fields.push({
                    name: 'params',
                    type: ParameterTypes.Form1,
                    props: {
                        className: formStyles.eventParamsForm,
                        config: paramsConfig,
                    },
                })
            }

            return fields
        },
        getItemInitialValue: (): FigureEventCondition => ({
            subject: {
                entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                matchMode: 'any',
            },
            type: FigureEventConditionType.hasFigureInArea,
            params: getDefaultConditionParamsForType(FigureEventConditionType.hasFigureInArea),
        }),
    }
}

export function createEventConditionsArrayProps(ownerFigureId?: FigureId) {
    return createConditionsArrayProps({ ownerFigureId, context: 'event' })
}

export function createMoveConditionsArrayProps(ownerFigureId?: FigureId) {
    return createConditionsArrayProps({ ownerFigureId, context: 'move' })
}

export { figureEventConditionTypeLabels }
