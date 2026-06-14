import React, { FC, useCallback, useEffect } from 'react'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { FigureId } from '../../types/figures'
import { useGameContext } from '../../context'
import {
    FIGURE_FILTER_NONE,
    isFigureFilterSentinel,
} from '../../figureFilter'
import { FigureStateSelect } from './FigureStateSelect'

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
