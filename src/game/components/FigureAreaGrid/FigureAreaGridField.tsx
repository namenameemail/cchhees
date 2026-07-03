import React, { FC, useCallback, useMemo } from 'react'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { useGameContext } from '../../context'
import { resolveFigureMoveDirectionFromCatalog } from '../../figureView'
import { FigureEventAreaCell, FigureEventFigureFilter } from '../../types/events'
import { isConcreteFigureFilter } from '../../figureFilter'
import { FigureAreaGrid } from './FigureAreaGrid'

export interface FigureAreaGridFieldProps {
    className?: string
    title?: string
    previewFigureId?: string
    previewStateIndex?: number
}

export const FigureAreaGridField: FC<ParameterInputComponentProps> = ({
    props,
    formState,
    onFieldsChange,
}) => {
    const {
        className,
        previewFigureId: previewFigureIdProp,
        previewStateIndex: previewStateIndexProp,
    } = props as FigureAreaGridFieldProps
    const cells = (formState?.cells ?? []) as FigureEventAreaCell[]
    const orientToTeamDirection = formState?.orientToTeamDirection === true
    const anchorFigures = formState?.anchorFigures as FigureEventFigureFilter[] | undefined

    const { figureCatalog, state, figureTeams } = useGameContext()

    const preview = useMemo(() => {
        if (previewFigureIdProp) {
            return {
                figureId: previewFigureIdProp,
                stateIndex: previewStateIndexProp ?? 0,
            }
        }

        const concrete = anchorFigures?.find(entry => isConcreteFigureFilter(entry.figureId))

        if (!concrete?.figureId) {
            return undefined
        }

        return {
            figureId: concrete.figureId,
            stateIndex: concrete.stateIndex ?? 0,
        }
    }, [anchorFigures, previewFigureIdProp, previewStateIndexProp])

    const moveDirection = useMemo(() => {
        if (!orientToTeamDirection || !preview?.figureId) {
            return undefined
        }

        return resolveFigureMoveDirectionFromCatalog(
            figureCatalog,
            preview.figureId,
            state.boardParameters,
            figureTeams,
        )
    }, [figureCatalog, figureTeams, orientToTeamDirection, preview?.figureId, state.boardParameters])

    const handleChange = useCallback((nextCells: FigureEventAreaCell[]) => {
        onFieldsChange?.({ cells: nextCells })
    }, [onFieldsChange])

    const handleOrientToggle = useCallback(() => {
        onFieldsChange?.({ orientToTeamDirection: !orientToTeamDirection })
    }, [onFieldsChange, orientToTeamDirection])

    return (
        <div className={className}>
            <FigureAreaGrid
                cells={cells}
                previewFigureId={preview?.figureId}
                previewStateIndex={preview?.stateIndex}
                moveDirection={moveDirection}
                orientToTeamDirection={orientToTeamDirection}
                onOrientToggle={handleOrientToggle}
                onChange={handleChange}
            />
        </div>
    )
}

export function createFigureAreaGridFieldConfig<StateType extends Record<string, unknown>>(
    name: keyof StateType & string,
    options: FigureAreaGridFieldProps = {},
): Form1FieldConfig<StateType> {
    return {
        name,
        Component: FigureAreaGridField,
        props: options,
    }
}
