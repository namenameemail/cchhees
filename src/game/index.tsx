import React, { useState } from 'react'
import cn from 'classnames'

import styles from './styles.module.css'

import { GameProvider } from './context'
import { useProjectContext } from '../projects/ProjectContext'
import { BoardParametersForm } from './components/BoardParametersForm/BoardParametersForm'
import { Figures } from './components/Figures'
import { Board } from './components/Board'
import { Tray } from './components/Tray'
import { History } from './components/History'
import { CellParametersForm } from './components/CellParametersForm/CellParametersForm'
// import { AutomaticConnectionsParametersForm } from './components/AutomaticConnectionsParametersForm'
import { Conditions } from './components/BoardConditions'
import { ConnectionsConditions } from './components/BoardConnectionsConditions'
import { ConnectionParametersForm } from './components/ConnectionParametersForm/ConnectionParametersForm'

export interface GameProps {

}

/**
 * probe
 * connection
 * connection styles
 * cell styles
 * connection mode
 * connection erase
 *
 * */

export const Game: React.FC<GameProps> = () => {

    const { isReady, currentProject, persistProjectData } = useProjectContext()
    const [tab, setTab] = useState(0)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const handleBoardTab = () => {
        if (isSettingsOpen && tab === 0) {
            setIsSettingsOpen(false)
        } else {
            setTab(0)
            setIsSettingsOpen(true)
        }
    }

    const handleFiguresTab = () => {
        if (isSettingsOpen && tab === 1) {
            setIsSettingsOpen(false)
        } else {
            setTab(1)
            setIsSettingsOpen(true)
        }
    }

    if (!isReady || !currentProject) {
        return null
    }

    return (
        <div className={styles.gameLayout}>
            <GameProvider
                key={currentProject.id}
                initialState={currentProject.gameState}
                initialHistory={currentProject.stateHistory}
                onPersist={persistProjectData}
            >

                <div className={styles.board}>
                    <Board/>
                    <div className={styles.bottom}>
                        <Tray/>
                        <History/>
                    </div>
                </div>

                <aside className={styles.settingsShell}>
                    <div
                        className={cn(
                            styles.settingsPanel,
                            isSettingsOpen && styles.settingsPanelOpen,
                        )}
                    >
                        {tab === 0 && (
                            <div className={styles.settingsBody}>
                                <BoardParametersForm/>
                                <div className={styles.arrays}>
                                    <Conditions/>
                                    <ConnectionsConditions/>
                                </div>
                            </div>
                        )}
                        {tab === 1 && (
                            <div className={styles.settingsBody}>
                                <Figures/>
                            </div>
                        )}
                    </div>

                    <div className={styles.settingTabs}>
                        <button
                            type="button"
                            className={cn(
                                styles.settingTab,
                                isSettingsOpen && tab === 0 && styles.settingTabActive,
                            )}
                            data-label="board"
                            onClick={handleBoardTab}
                        >
                            <span className={styles.settingTabText}>board</span>
                        </button>
                        <button
                            type="button"
                            className={cn(
                                styles.settingTab,
                                isSettingsOpen && tab === 1 && styles.settingTabActive,
                            )}
                            data-label="figures"
                            onClick={handleFiguresTab}
                        >
                            <span className={styles.settingTabText}>figures</span>
                        </button>
                    </div>
                </aside>

            </GameProvider>
        </div>
    )
}
