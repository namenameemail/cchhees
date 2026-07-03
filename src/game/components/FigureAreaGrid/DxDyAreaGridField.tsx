import React, { FC, useCallback, useMemo } from 'react'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { FigureEventAreaCell } from '../../types/events'
import { FigureId } from '../../types/figures'
import { useGameContext } from '../../context'
import { resolveFigureMoveDirectionFromCatalog } from '../../figureView'
import { FigureAreaGrid } from './FigureAreaGrid'

export interface DxDyAreaGridFieldProps {
    className?: string
    previewFigureId?: FigureId
    previewStateIndex?: number
}

export const DxDyAreaGridField: FC<ParameterInputComponentProps> = ({
    props,
    formState,
    onFieldsChange,
}) => {
    const { className, previewFigureId, previewStateIndex = 0 } = props as DxDyAreaGridFieldProps
    const { figureCatalog, state, figureTeams } = useGameContext()

    const dx = typeof formState?.dx === 'number' ? Math.trunc(formState.dx) : 1
    const dy = typeof formState?.dy === 'number' ? Math.trunc(formState.dy) : 0
    const orientToTeamDirection = formState?.orientToTeamDirection === true

    const cells = useMemo<FigureEventAreaCell[]>(
        () => (dx !== 0 || dy !== 0) ? [{ x: dx, y: dy }] : [],
        [dx, dy],
    )

    const moveDirection = useMemo(() => {
        if (!orientToTeamDirection || !previewFigureId) {
            return undefined
        }

        return resolveFigureMoveDirectionFromCatalog(
            figureCatalog,
            previewFigureId,
            state.boardParameters,
            figureTeams,
        )
    }, [figureCatalog, figureTeams, orientToTeamDirection, previewFigureId, state.boardParameters])

    const handleChange = useCallback((nextCells: FigureEventAreaCell[]) => {
        const [cell] = nextCells

        if (cell) {
            onFieldsChange?.({ dx: cell.x, dy: cell.y })
        }
    }, [onFieldsChange])

    const handleOrientToggle = useCallback(() => {
        onFieldsChange?.({ orientToTeamDirection: !orientToTeamDirection })
    }, [onFieldsChange, orientToTeamDirection])

    return (
        <div className={className}>
            <FigureAreaGrid
                cells={cells}
                singleCell
                previewFigureId={previewFigureId}
                previewStateIndex={previewStateIndex}
                moveDirection={moveDirection}
                orientToTeamDirection={orientToTeamDirection}
                onOrientToggle={handleOrientToggle}
                onChange={handleChange}
            />
        </div>
    )
}

export function createDxDyAreaGridFieldConfig<StateType extends Record<string, unknown>>(
    name: keyof StateType & string,
    options: DxDyAreaGridFieldProps = {},
): Form1FieldConfig<StateType> {
    return {
        name,
        Component: DxDyAreaGridField,
        props: options,
    }
}
