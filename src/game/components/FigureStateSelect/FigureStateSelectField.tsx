import React, { FC, useCallback, useEffect } from 'react'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { FigureId } from '../../types/figures'
import { FigureEventConditionSubject } from '../../types/events'
import { useGameContext } from '../../context'
import {
    FIGURE_FILTER_NONE,
    isFigureFilterSentinel,
} from '../../figureFilter'
import { FigureStateSelect } from './FigureStateSelect'
import { FigureFilterArrayField, FigureFilterArrayFieldProps } from './FigureFilterArrayField'
import { ConditionSubjectField, ConditionSubjectFieldProps } from './ConditionSubjectField'
import formStyles from '../FigureParametersForm/styles.module.css'

export const FigureFilterArrayWithMatchModeField: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    props,
    formState,
    onFieldsChange,
}) => {
    const { matchModeField = 'matchMode', ...restProps } = props as FigureFilterArrayFieldProps & { matchModeField?: string }
    const matchMode = (formState?.[matchModeField] as 'any' | 'all' | undefined) ?? 'any'

    const handleChange = useCallback((_n: string, entries: unknown) => {
        onChange(name, entries)
    }, [name, onChange])

    const handleMatchModeChange = useCallback((mode: 'any' | 'all') => {
        onFieldsChange?.({ [matchModeField]: mode })
    }, [matchModeField, onFieldsChange])

    return (
        <FigureFilterArrayField
            name={name}
            value={value}
            onChange={handleChange}
            props={{
                ...restProps,
                matchMode,
                onMatchModeChange: handleMatchModeChange,
            }}
        />
    )
}

export function createFigureFilterArrayWithMatchModeFieldConfig<StateType extends Record<string, unknown>>(
    name: keyof StateType & string,
    options: FigureFilterArrayFieldProps & { matchModeField?: string } = {},
): Form1FieldConfig<StateType> {
    return {
        name,
        Component: FigureFilterArrayWithMatchModeField,
        props: options,
    }
}

export interface FigureStateSelectFieldProps {
    figureField: string
    stateField?: string
    allowAny?: boolean
    showStatePicker?: boolean
    className?: string
    title?: string
}

export const FigureStateSelectField: FC<ParameterInputComponentProps> = ({
    props,
    formState,
    onFieldsChange,
}) => {
    const {
        figureField,
        stateField,
        allowAny = false,
        showStatePicker = true,
        className,
        title,
    } = props as FigureStateSelectFieldProps

    const { state: { figureCatalog } } = useGameContext()

    const figureId = formState?.[figureField] as FigureId | undefined
    const stateIndex = stateField != null
        ? formState?.[stateField] as number | undefined
        : undefined

    const isStoredValueValid = figureId == null
        || isFigureFilterSentinel(figureId)
        || figureCatalog.some(entry => entry.id === figureId)

    useEffect(() => {
        if (!onFieldsChange || isStoredValueValid) {
            return
        }

        const patch: Record<string, unknown> = {
            [figureField]: allowAny ? FIGURE_FILTER_NONE : undefined,
        }

        if (stateField != null) {
            patch[stateField] = undefined
        }

        onFieldsChange(patch)
    }, [allowAny, figureField, stateField, isStoredValueValid, onFieldsChange])

    const handleChange = useCallback((nextFigureId: FigureId | undefined, nextStateIndex?: number) => {
        if (!onFieldsChange) {
            return
        }

        const patch: Record<string, unknown> = {
            [figureField]: nextFigureId,
        }

        if (stateField != null) {
            if (nextFigureId == null
                || nextFigureId === ''
                || isFigureFilterSentinel(nextFigureId)) {
                patch[stateField] = undefined
            } else if (nextStateIndex !== undefined) {
                patch[stateField] = nextStateIndex
            }
        }

        onFieldsChange(patch)
    }, [figureField, stateField, onFieldsChange])

    const resolvedFigureId = isStoredValueValid
        ? figureId
        : (allowAny ? FIGURE_FILTER_NONE : undefined)

    return (
        <FigureStateSelect
            figureId={resolvedFigureId}
            stateIndex={stateIndex}
            allowAny={allowAny}
            showStatePicker={showStatePicker}
            onChange={handleChange}
            className={className}
            title={title}
        />
    )
}

export function createFigureStateFieldConfig<StateType extends Record<string, unknown>>(
    figureField: keyof StateType & string,
    options: Omit<FigureStateSelectFieldProps, 'figureField'> & { name?: string } = {},
): Form1FieldConfig<StateType> {
    const { name, ...fieldProps } = options

    return {
        name: (name ?? figureField) as keyof StateType & string,
        Component: FigureStateSelectField,
        props: {
            figureField,
            ...fieldProps,
        },
    }
}

export type { FigureFilterArrayFieldProps } from './FigureFilterArrayField'
export { createActionSubjectFieldConfig } from './ActionSubjectField'
export type { ActionSubjectFieldProps } from './ActionSubjectField'

export function createConditionSubjectFieldConfig<StateType extends Record<string, unknown>>(
    options: ConditionSubjectFieldProps = {},
): Form1FieldConfig<StateType> {
    const { className, itemClassName, title, allowedRoles } = options

    return {
        name: 'entries' as keyof StateType & string,
        Component: ConditionSubjectField,
        props: {
            className: className ?? formStyles.figureFilterArray,
            itemClassName,
            title,
            allowedRoles,
        },
    }
}

export const ConditionSubjectAndMatchModeField: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    props,
}) => {
    const subject = (value ?? { entries: [] }) as FigureEventConditionSubject

    const handleEntriesChange = useCallback((_n: string, entries: unknown) => {
        onChange(name, { ...subject, entries })
    }, [name, onChange, subject])

    const handleMatchModeChange = useCallback((matchMode: 'any' | 'all') => {
        onChange(name, { ...subject, matchMode })
    }, [name, onChange, subject])

    return (
        <ConditionSubjectField
            name="entries"
            value={subject.entries}
            onChange={handleEntriesChange}
            props={{
                ...(props as ConditionSubjectFieldProps),
                matchMode: subject.matchMode ?? 'any',
                onMatchModeChange: handleMatchModeChange,
            }}
        />
    )
}

export function createConditionSubjectWithMatchModeFieldConfig<StateType extends Record<string, unknown>>(
    options: ConditionSubjectFieldProps = {},
): Form1FieldConfig<StateType> {
    const { className, itemClassName, title, allowedRoles } = options

    return {
        name: 'subject' as keyof StateType & string,
        Component: ConditionSubjectAndMatchModeField,
        props: {
            className: className ?? formStyles.figureFilterArray,
            itemClassName,
            title,
            allowedRoles,
        },
    }
}

export function createFigureFilterArrayFieldConfig<StateType extends Record<string, unknown>>(
    name: keyof StateType & string,
    options: FigureFilterArrayFieldProps = {},
): Form1FieldConfig<StateType> {
    const {
        allowAny = true,
        showStatePicker = true,
        className,
        itemClassName,
        title,
    } = options

    return {
        name,
        Component: FigureFilterArrayField,
        props: {
            allowAny,
            showStatePicker,
            className,
            itemClassName,
            title,
        },
    }
}
