import React, { FC, useCallback, useMemo } from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import { FigureMoveDirection } from '../../types/figures'
import {
    defaultTeamName,
    FIGURE_MOVE_DIRECTION_OPTIONS,
    getFiguresForTeam,
    nextTeamId,
} from '../../figureTeams'
import { TeamFiguresPicker } from './TeamFiguresPicker'
import formStyles from '../FigureParametersForm/styles.module.css'
import styles from './TeamsPanel.module.css'

export const TeamsPanel: FC = () => {
    const {
        state,
        figureTeams,
        setFigureTeams,
        setTeamMembers,
    } = useGameContext()

    const { figureCatalog } = state

    const handleAddTeam = useCallback(() => {
        const id = nextTeamId(figureTeams)
        setFigureTeams([...figureTeams, { id, name: defaultTeamName(id) }])
    }, [figureTeams, setFigureTeams])

    const handleNameChange = useCallback((teamId: number, name: string) => {
        const trimmed = name.trim()

        setFigureTeams(figureTeams.map(team => (
            team.id === teamId
                ? { ...team, name: trimmed || defaultTeamName(teamId) }
                : team
        )))
    }, [figureTeams, setFigureTeams])

    const handleMoveDirectionChange = useCallback((teamId: number, direction: FigureMoveDirection) => {
        setFigureTeams(figureTeams.map(team => {
            if (team.id !== teamId) {
                return team
            }

            const next: typeof team = { ...team }

            if (direction === 'up') {
                delete next.moveDirection
            } else {
                next.moveDirection = direction
            }

            return next
        }))
    }, [figureTeams, setFigureTeams])

    const handleRemoveTeam = useCallback((teamId: number) => {
        setTeamMembers(teamId, [])
        setFigureTeams(figureTeams.filter(team => team.id !== teamId))
    }, [figureTeams, setFigureTeams, setTeamMembers])

    const teamRows = useMemo(
        () => figureTeams.map(team => ({
            team,
            members: getFiguresForTeam(figureCatalog, team.id),
        })),
        [figureCatalog, figureTeams],
    )

    return (
        <div className={formStyles.figureParametersFormLayout}>
            <div className={formStyles.sectionPanelsScroll}>
                <div className={formStyles.sectionPanel}>
                    <div className={formStyles.eventRulesSection}>
                        <div className={formStyles.eventRulesArray}>
                            {teamRows.map(({ team, members }) => (
                                <div key={team.id} className={styles.teamRow}>
                                    <div className={styles.teamHeader}>
                                        <input
                                            type="text"
                                            className={styles.teamNameInput}
                                            defaultValue={team.name}
                                            key={`${team.id}-${team.name}`}
                                            onBlur={event => handleNameChange(team.id, event.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className={styles.teamRemoveButton}
                                            onClick={() => handleRemoveTeam(team.id)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className={formStyles.moveDirectionRow}>
                                        <span className={formStyles.stateRowLabel}>направление</span>
                                        <div className={formStyles.moveDirectionTabs}>
                                            {FIGURE_MOVE_DIRECTION_OPTIONS.map(({ id, label }) => (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    className={cn(
                                                        (team.moveDirection ?? 'up') === id
                                                            ? formStyles.moveDirectionTabActive
                                                            : formStyles.moveDirectionTab,
                                                    )}
                                                    onClick={() => handleMoveDirectionChange(team.id, id)}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <TeamFiguresPicker
                                        selectedFigureIds={members}
                                        onChange={figureIds => setTeamMembers(team.id, figureIds)}
                                    />
                                </div>
                            ))}
                            <div className={formStyles.eventRulesAddRow}>
                                <button type="button" onClick={handleAddTeam}>+</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
