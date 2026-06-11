import React, { useRef, useState } from 'react'
import cn from 'classnames'

import styles from './styles.module.css'

import { GameProvider } from './context'
import { useProjectContext } from '../projects/ProjectContext'
import { BoardParametersForm } from './components/BoardParametersForm/BoardParametersForm'
import { BoardHistory } from './components/BoardHistory'
import { Figures } from './components/Figures'
import { Board } from './components/Board'
import { Tray } from './components/Tray'
import { History } from './components/History'
import { CellParametersForm } from './components/CellParametersForm/CellParametersForm'
// import { AutomaticConnectionsParametersForm } from './components/AutomaticConnectionsParametersForm'
import { BoardStyleRules } from './components/BoardStyleRules'
import { AssetsPanel } from '../projects/components/AssetsPanel'

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
    const [leftTab, setLeftTab] = useState(0)
    const [isToolsOpen, setIsToolsOpen] = useState(false)
    const boardRef = useRef<SVGSVGElement>(null)

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

    const handleAssetsTab = () => {
        if (isSettingsOpen && tab === 2) {
            setIsSettingsOpen(false)
        } else {
            setTab(2)
            setIsSettingsOpen(true)
        }
    }

    const handleTrayTab = () => {
        if (isToolsOpen && leftTab === 0) {
            setIsToolsOpen(false)
        } else {
            setLeftTab(0)
            setIsToolsOpen(true)
        }
    }

    const handleHistoryTab = () => {
        if (isToolsOpen && leftTab === 1) {
            setIsToolsOpen(false)
        } else {
            setLeftTab(1)
            setIsToolsOpen(true)
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
                initialFiguresHistory={currentProject.figuresHistory}
                initialBoardHistory={currentProject.boardHistory}
                onPersist={persistProjectData}
            >

                <aside className={styles.toolsShell}>
                    <div className={styles.toolTabs}>
                        <button
                            type="button"
                            className={cn(
                                styles.settingTab,
                                isToolsOpen && leftTab === 0 && styles.settingTabActive,
                            )}
                            data-label="tray"
                            onClick={handleTrayTab}
                        >
                            <span className={styles.settingTabText}>tray</span>
                        </button>
                        <button
                            type="button"
                            className={cn(
                                styles.settingTab,
                                isToolsOpen && leftTab === 1 && styles.settingTabActive,
                            )}
                            data-label="history"
                            onClick={handleHistoryTab}
                        >
                            <span className={styles.settingTabText}>history</span>
                        </button>
                    </div>

                    <div
                        className={cn(
                            styles.toolsPanel,
                            isToolsOpen && styles.toolsPanelOpen,
                        )}
                    >
                        {leftTab === 0 && (
                            <div className={styles.toolsBody}>
                                <Tray />
                            </div>
                        )}
                        {leftTab === 1 && (
                            <div className={styles.toolsBody}>
                                <History />
                            </div>
                        )}
                    </div>
                </aside>

                <div className={styles.board}>
                    <Board ref={boardRef} />
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
                                <BoardHistory boardRef={boardRef} />
                                <BoardParametersForm />
                                <div className={styles.arrays}>
                                    <BoardStyleRules />
                                </div>
                            </div>
                        )}
                        {tab === 1 && (
                            <div className={styles.settingsBody}>
                                <Figures />
                            </div>
                        )}
                        {tab === 2 && (
                            <div className={styles.settingsBody}>
                                <AssetsPanel />
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
                        <button
                            type="button"
                            className={cn(
                                styles.settingTab,
                                isSettingsOpen && tab === 2 && styles.settingTabActive,
                            )}
                            data-label="assets"
                            onClick={handleAssetsTab}
                        >
                            <span className={styles.settingTabText}>assets</span>
                        </button>
                    </div>
                </aside>

            </GameProvider>
        </div>
    )
}
