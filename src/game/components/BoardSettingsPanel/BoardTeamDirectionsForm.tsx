import React, { FC, useCallback } from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import { FIGURE_MOVE_DIRECTION_OPTIONS } from '../../figureTeams'
import { patchBoardTeamMoveDirection } from '../../boardTeamDirections'
import { FigureMoveDirection } from '../../types/figures'
import formStyles from '../FigureParametersForm/styles.module.css'
import styles from './BoardTeamDirectionsForm.module.css'

export const BoardTeamDirectionsForm: FC = () => {
    const { state, figureTeams, setBoardParameters } = useGameContext()
    const teamMoveDirections = state.boardParameters.teamMoveDirections ?? {}

    const handleMoveDirectionChange = useCallback((teamId: number, direction: FigureMoveDirection) => {
        setBoardParameters(patchBoardTeamMoveDirection(state.boardParameters, teamId, direction))
    }, [setBoardParameters, state.boardParameters])

    if (figureTeams.length === 0) {
        return (
            <div className={styles.emptyState}>
                Нет команд — добавьте их на вкладке «команды».
            </div>
        )
    }

    return (
        <div className={styles.teamDirectionsList}>
            {figureTeams.map(team => (
                <div key={team.id} className={styles.teamRow}>
                    <span className={styles.teamName}>{team.name}</span>
                    <div className={formStyles.moveDirectionRow}>
                        <span className={formStyles.stateRowLabel}>направление</span>
                        <div className={formStyles.moveDirectionTabs}>
                            {FIGURE_MOVE_DIRECTION_OPTIONS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    className={cn(
                                        (teamMoveDirections[team.id] ?? 'up') === id
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
                </div>
            ))}
        </div>
    )
}
