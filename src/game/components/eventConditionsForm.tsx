import React, { FC } from 'react'
import { ParameterInputComponentProps } from '../../components/Form1'
import { Form1FieldConfig } from '../../components/Form1/types'
import { ParameterTypes } from '../../components/Form1/types'
import { atLeastOne, integerStep, nonNegative } from '../../components/Form1/numberInputConstraints'
import { FigureId } from '../types/figures'
import { FigureEventCondition, FigureEventConditionType } from '../types/events'
import {
    ConditionContext,
    getConditionTypesForContext,
} from '../events/conditions/conditionContexts'
import {
    createConditionSubjectFieldConfig,
    createFigureFilterArrayFieldConfig,
} from './FigureStateSelect/FigureStateSelectField'
import { createFigureAreaGridFieldConfig } from './FigureAreaGrid/FigureAreaGridField'
import { createTeamOrientFieldConfig } from './TeamOrientCheckbox'
import { FIGURE_FILTER_ANY, FIGURE_SUBJECT_MOVED } from '../figureFilter'
import formStyles from './FigureParametersForm/styles.module.css'

const figureEventConditionTypeLabels: Record<FigureEventConditionType, string> = {
    [FigureEventConditionType.inBoardArea]: 'находится в области доски',
    [FigureEventConditionType.inFigureArea]: 'находится в области фигуры',
    [FigureEventConditionType.onCells]: 'находится на клетках',
    [FigureEventConditionType.aboveFigures]: 'находится над фигурами',
    [FigureEventConditionType.belowFigures]: 'находится под фигурами',
    [FigureEventConditionType.leftCell]: 'ушла с клетки',
    [FigureEventConditionType.movedBy]: 'сдвинулась на',
    [FigureEventConditionType.landedInBoardArea]: 'встала в области доски',
    [FigureEventConditionType.landedInFigureArea]: 'встала в области фигуры',
    [FigureEventConditionType.landedOnCell]: 'встала на клетку',
    [FigureEventConditionType.landedOnFigure]: 'встала на фигуру',
    [FigureEventConditionType.figureEnteredArea]: 'в область владельца вошла сф',
    [FigureEventConditionType.steppedOnByFigure]: 'на неё наступила фигура',
    [FigureEventConditionType.isFigure]: 'является',
    [FigureEventConditionType.isNotFigure]: 'не является',
    [FigureEventConditionType.exitedBoard]: 'вышла за границу доски',
    [FigureEventConditionType.hoppedOverFigures]: 'перепрыгнула фигуры',
    [FigureEventConditionType.hasFigureInArea]: 'имеет фигуру в области',
}

const conditionMatchModeOptions = ['any', 'all'] as const
const stackTargetOptions = ['all', 'top', 'bottom', 'fromTop', 'fromBottom'] as const

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

function getDefaultConditionParams(type: FigureEventConditionType) {
    switch (type) {
        case FigureEventConditionType.landedOnFigure:
        case FigureEventConditionType.aboveFigures:
        case FigureEventConditionType.belowFigures:
        case FigureEventConditionType.hoppedOverFigures:
        case FigureEventConditionType.hasFigureInArea:
            return { figures: [{ figureId: FIGURE_FILTER_ANY }], matchMode: 'any' }
        case FigureEventConditionType.steppedOnByFigure:
            return { stepperFigures: [{ figureId: FIGURE_FILTER_ANY }], matchMode: 'any' }
        case FigureEventConditionType.isFigure:
        case FigureEventConditionType.isNotFigure:
            return { figures: [{ figureId: FIGURE_FILTER_ANY }] }
        case FigureEventConditionType.onCells:
            return { cells: [{ x: 1, y: 1 }], matchMode: 'any' }
        case FigureEventConditionType.movedBy:
            return { dx: 1, dy: 0 }
        case FigureEventConditionType.leftCell:
        case FigureEventConditionType.landedOnCell:
            return { x: 1, y: 1 }
        case FigureEventConditionType.inBoardArea:
        case FigureEventConditionType.landedInBoardArea:
            return { x1: 1, y1: 1, x2: 1, y2: 1 }
        case FigureEventConditionType.landedInFigureArea:
        case FigureEventConditionType.figureEnteredArea:
            return { includePassive: true }
        default:
            return {}
    }
}

export function getDefaultConditionParamsForType(type: FigureEventConditionType) {
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

/** Reset params when condition type changes so normalize does not drop the row. */
export function coalesceConditionsOnTypeChange(
    previous: FigureEventCondition[] | undefined,
    next: FigureEventCondition[],
): FigureEventCondition[] {
    return next.map((condition, index) => {
        const prev = previous?.[index]

        if (prev?.type === condition.type) {
            return condition
        }

        return {
            ...condition,
            params: getDefaultConditionParamsForType(condition.type),
        }
    })
}

function withTeamOrient(
    fields: Form1FieldConfig<Record<string, unknown>>[],
    title?: string,
): Form1FieldConfig<Record<string, unknown>>[] {
    return [createTeamOrientFieldConfig({ title }), ...fields]
}

function getConditionParamsConfig(
    type: FigureEventConditionType,
    ownerFigureId?: FigureId,
    context?: ConditionContext,
) {
    switch (type) {
        case FigureEventConditionType.inBoardArea:
        case FigureEventConditionType.landedInBoardArea:
            return withTeamOrient([
                { name: 'x1', type: ParameterTypes.NumberInput, props: { placeholder: 'x1', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y1', type: ParameterTypes.NumberInput, props: { placeholder: 'y1', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'x2', type: ParameterTypes.NumberInput, props: { placeholder: 'x2', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y2', type: ParameterTypes.NumberInput, props: { placeholder: 'y2', ...atLeastOne, ...eventNumberInputProps } },
            ])
        case FigureEventConditionType.inFigureArea:
        case FigureEventConditionType.landedInFigureArea:
            return withTeamOrient([
                createFigureFilterArrayFieldConfig('anchorFigures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
                createFigureAreaGridFieldConfig('cells', {
                    className: formStyles.figureAreaGridField,
                    previewFigureId: type === FigureEventConditionType.landedInFigureArea ? ownerFigureId : undefined,
                }),
                ...(type === FigureEventConditionType.landedInFigureArea
                    ? [{
                        name: 'includePassive',
                        Component: ManualCheckbox,
                        props: { text: 'пассивный вход' },
                    }]
                    : []),
            ])
        case FigureEventConditionType.figureEnteredArea:
            return withTeamOrient([
                createFigureAreaGridFieldConfig('cells', {
                    className: formStyles.figureAreaGridField,
                    previewFigureId: ownerFigureId,
                }),
                {
                    name: 'includePassive',
                    Component: ManualCheckbox,
                    props: { text: 'пассивный вход' },
                },
            ])
        case FigureEventConditionType.hasFigureInArea:
            return withTeamOrient([
                createFigureFilterArrayFieldConfig('figures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
                createFigureAreaGridFieldConfig('cells', {
                    className: formStyles.figureAreaGridField,
                    previewFigureId: ownerFigureId,
                }),
                {
                    name: 'matchMode',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: conditionMatchModeOptions,
                    },
                },
            ])
        case FigureEventConditionType.onCells:
            return withTeamOrient([
                {
                    name: 'cells',
                    type: ParameterTypes.Array,
                    props: {
                        className: formStyles.conditionCellsArray,
                        itemClassName: formStyles.conditionCellItem,
                        itemConfig: () => [
                            { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne, ...eventNumberInputProps } },
                            { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne, ...eventNumberInputProps } },
                        ],
                        getItemInitialValue: () => ({ x: 1, y: 1 }),
                    },
                },
                {
                    name: 'matchMode',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: conditionMatchModeOptions,
                    },
                },
            ])
        case FigureEventConditionType.aboveFigures:
        case FigureEventConditionType.belowFigures:
        case FigureEventConditionType.hoppedOverFigures:
            return [
                createFigureFilterArrayFieldConfig('figures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
                {
                    name: 'matchMode',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: conditionMatchModeOptions,
                    },
                },
            ]
        case FigureEventConditionType.leftCell:
        case FigureEventConditionType.landedOnCell:
            return withTeamOrient([
                { name: 'x', type: ParameterTypes.NumberInput, props: { placeholder: 'x', ...atLeastOne, ...eventNumberInputProps } },
                { name: 'y', type: ParameterTypes.NumberInput, props: { placeholder: 'y', ...atLeastOne, ...eventNumberInputProps } },
            ], 'В режиме учёта направления x/y — смещение от якоря (как в области), не номер клетки доски')
        case FigureEventConditionType.movedBy:
            return withTeamOrient([
                { name: 'dx', type: ParameterTypes.NumberInput, props: { placeholder: 'dx', ...integerStep, ...eventNumberInputProps } },
                { name: 'dy', type: ParameterTypes.NumberInput, props: { placeholder: 'dy', ...integerStep, ...eventNumberInputProps } },
            ])
        case FigureEventConditionType.landedOnFigure:
            return [
                createFigureFilterArrayFieldConfig('figures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
                {
                    name: 'matchMode',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: conditionMatchModeOptions,
                    },
                },
                {
                    name: 'stackTarget',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: stackTargetOptions,
                    },
                },
                {
                    name: 'stackIndex',
                    type: ParameterTypes.NumberInput,
                    props: { placeholder: 'stack index', ...nonNegative, ...integerStep, ...eventNumberInputProps },
                },
            ]
        case FigureEventConditionType.steppedOnByFigure:
            return [
                createFigureFilterArrayFieldConfig('stepperFigures', {
                    allowAny: true,
                    className: formStyles.figureFilterArray,
                    itemClassName: formStyles.figureFilterArrayItem,
                }),
                {
                    name: 'matchMode',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: conditionMatchModeOptions,
                    },
                },
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
    const isMoveContext = context === 'move'

    return {
        className: formStyles.eventConditionsArray,
        itemClassName: formStyles.eventConditionItem,
        itemFormClassName: formStyles.eventConditionItemForm,
        addButtonClassName: formStyles.eventConditionsAddRow,
        itemConfig: (item: FigureEventCondition) => {
            const paramsConfig = getConditionParamsConfig(item.type, ownerFigureId, context)
            const restrictSubjectRoles = item.type === FigureEventConditionType.hasFigureInArea
            const fields: Form1FieldConfig<FigureEventCondition>[] = [
                {
                    name: 'subject',
                    type: ParameterTypes.Form1,
                    props: {
                        className: formStyles.eventParamsForm,
                        config: [
                            createConditionSubjectFieldConfig({
                                ...(restrictSubjectRoles ? { allowedRoles: ['moved'] as const } : {}),
                            }) as unknown as Form1FieldConfig<FigureEventCondition['subject']>,
                            {
                                name: 'matchMode',
                                type: ParameterTypes.SelectArray,
                                props: {
                                    className: formStyles.eventTypeSelect,
                                    options: conditionMatchModeOptions,
                                },
                                visibility: (subject) => (subject.entries?.length ?? 0) > 1,
                            },
                        ],
                    },
                },
                {
                    name: 'type',
                    type: ParameterTypes.SelectArray,
                    props: {
                        className: formStyles.eventTypeSelect,
                        options: conditionTypeOptions,
                        optionLabels: figureEventConditionTypeLabels,
                    },
                },
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
        getItemInitialValue: (): FigureEventCondition => {
            if (isMoveContext) {
                return {
                    subject: {
                        entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                        matchMode: 'any',
                    },
                    type: FigureEventConditionType.hasFigureInArea,
                    params: getDefaultConditionParamsForType(FigureEventConditionType.hasFigureInArea),
                }
            }

            return {
                subject: {
                    entries: [{ figureId: FIGURE_SUBJECT_MOVED }],
                    matchMode: 'any',
                },
                type: FigureEventConditionType.landedOnFigure,
                params: getDefaultConditionParamsForType(FigureEventConditionType.landedOnFigure),
            }
        },
    }
}

export function createEventConditionsArrayProps(ownerFigureId?: FigureId) {
    return createConditionsArrayProps({ ownerFigureId, context: 'event' })
}

export function createMoveConditionsArrayProps(ownerFigureId?: FigureId) {
    return createConditionsArrayProps({ ownerFigureId, context: 'move' })
}

export { figureEventConditionTypeLabels }
