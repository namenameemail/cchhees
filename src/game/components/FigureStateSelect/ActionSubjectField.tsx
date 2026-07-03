import React, { FC, useCallback, useMemo } from 'react'
import cn from 'classnames'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { Form1FieldConfig } from '../../../components/Form1/types'
import { FigureEventAreaCell, FigureEventConditionSubject } from '../../types/events'
import { FigureId } from '../../types/figures'
import { isConcreteFigureFilter } from '../../figureFilter'
import { FigureAreaGrid } from '../FigureAreaGrid/FigureAreaGrid'
import { useGameContext } from '../../context'
import { resolveFigureMoveDirectionFromCatalog } from '../../figureView'
import { ConditionSubjectField } from './ConditionSubjectField'
import formStyles from '../FigureParametersForm/styles.module.css'

export interface ActionSubjectFieldProps {
    className?: string
    ownerFigureId?: FigureId
}

export const ActionSubjectField: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    props,
}) => {
    const { className, ownerFigureId } = props as ActionSubjectFieldProps
    const subject = (value ?? { entries: [] }) as FigureEventConditionSubject
    const { figureCatalog, state, figureTeams } = useGameContext()

    const previewFigure = useMemo(() => {
        if (ownerFigureId) {
            return { figureId: ownerFigureId, stateIndex: 0 }
        }

        const concrete = subject.entries?.find(entry => isConcreteFigureFilter(entry.figureId))

        if (!concrete?.figureId) {
            return undefined
        }

        return {
            figureId: concrete.figureId,
            stateIndex: concrete.stateIndex ?? 0,
        }
    }, [ownerFigureId, subject.entries])

    const nearbyMoveDirection = useMemo(() => {
        if (subject.nearby?.orientToTeamDirection !== true || !previewFigure?.figureId) {
            return undefined
        }

        return resolveFigureMoveDirectionFromCatalog(
            figureCatalog,
            previewFigure.figureId,
            state.boardParameters,
            figureTeams,
        )
    }, [figureCatalog, figureTeams, previewFigure?.figureId, state.boardParameters, subject.nearby?.orientToTeamDirection])

    const handleSubjectPatch = useCallback((patch: Partial<FigureEventConditionSubject>) => {
        onChange(name, { ...subject, ...patch })
    }, [name, onChange, subject])

    const handleEntriesChange = useCallback((_fieldName: string, entries: unknown) => {
        handleSubjectPatch({ entries: entries as FigureEventConditionSubject['entries'] })
    }, [handleSubjectPatch])

    const handleNearbyToggle = useCallback(() => {
        const enabled = subject.nearby?.enabled === true

        if (enabled) {
            handleSubjectPatch({ nearby: { enabled: false, cells: subject.nearby?.cells } })
            return
        }

        handleSubjectPatch({
            nearby: {
                enabled: true,
                cells: subject.nearby?.cells?.length
                    ? subject.nearby.cells
                    : [{ x: 0, y: 1 }],
            },
        })
    }, [handleSubjectPatch, subject.nearby])

    const handleNearbyCellsChange = useCallback((cells: FigureEventAreaCell[]) => {
        handleSubjectPatch({
            nearby: {
                ...subject.nearby,
                enabled: true,
                cells,
            },
        })
    }, [handleSubjectPatch, subject.nearby])

    const handleNearbyOrientToggle = useCallback(() => {
        handleSubjectPatch({
            nearby: {
                ...subject.nearby,
                enabled: true,
                orientToTeamDirection: !(subject.nearby?.orientToTeamDirection === true),
            },
        })
    }, [handleSubjectPatch, subject.nearby])

    const handleMatchModeChange = useCallback((matchMode: 'any' | 'all') => {
        handleSubjectPatch({ matchMode })
    }, [handleSubjectPatch])

    return (
        <>
            <div className={cn(formStyles.eventParamsForm, className)}>
                <ConditionSubjectField
                    name="entries"
                    value={subject.entries}
                    onChange={handleEntriesChange}
                    props={{
                        className: formStyles.figureFilterArray,
                        showNearbyToggle: true,
                        nearbyEnabled: subject.nearby?.enabled === true,
                        onNearbyToggle: handleNearbyToggle,
                        matchMode: subject.matchMode ?? 'any',
                        onMatchModeChange: handleMatchModeChange,
                    }}
                />
            </div>

            {subject.nearby?.enabled === true && (
                <div className={formStyles.figureAreaGridField}>
                    <FigureAreaGrid
                        cells={subject.nearby.cells ?? []}
                        previewFigureId={previewFigure?.figureId}
                        previewStateIndex={previewFigure?.stateIndex}
                        moveDirection={nearbyMoveDirection}
                        orientToTeamDirection={subject.nearby?.orientToTeamDirection === true}
                        onOrientToggle={handleNearbyOrientToggle}
                        onChange={handleNearbyCellsChange}
                    />
                </div>
            )}
        </>
    )
}

export function createActionSubjectFieldConfig<StateType extends Record<string, unknown>>(
    options: ActionSubjectFieldProps = {},
): Form1FieldConfig<StateType> {
    return {
        name: 'subject' as keyof StateType & string,
        Component: ActionSubjectField,
        props: options,
    }
}
