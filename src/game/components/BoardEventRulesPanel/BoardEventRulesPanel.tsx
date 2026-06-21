import React, { FC, useCallback, useEffect, useMemo } from 'react'
import { useGameContext } from '../../context'
import { EventRulesTable } from '../FigureParametersForm/FigureParametersForm'
import { setProfilerPanelChannel } from '../../../profiler'
import styles from '../FigureParametersForm/styles.module.css'

export const BoardEventRulesPanel: FC = () => {
    const { state, setBoardEventRules } = useGameContext()

    const figureOptions = useMemo(
        () => state.figureCatalog.map(entry => entry.id),
        [state.figureCatalog],
    )

    const eventRules = state.eventRules ?? []

    useEffect(() => {
        if (import.meta.env.DEV) {
            setProfilerPanelChannel('gameplay')
            return () => setProfilerPanelChannel('scroll')
        }
    }, [])

    const handleChange = useCallback((rules: typeof eventRules) => {
        setBoardEventRules(rules)
    }, [setBoardEventRules])

    return (
        <div className={styles.figureParametersFormLayout}>
            <div className={styles.sectionPanelsScroll}>
                <div
                    className={styles.sectionPanel}
                    title="События срабатывают при ходе в режиме игры. Действия применяются после базового перемещения."
                >
                    <EventRulesTable
                        eventRules={eventRules}
                        figureOptions={figureOptions}
                        onChange={handleChange}
                    />
                </div>
            </div>
        </div>
    )
}
