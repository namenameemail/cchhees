import React, { useState } from 'react'

import styles from './styles.module.css'

import { GameProvider } from './context'
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

    const [tab, setTab] = useState(0)
    return (
        <div className={styles.gameLayout}>
            <GameProvider>

                <div className={styles.board}>
                    <Board/>
                    <div className={styles.bottom}>
                        <Tray/>
                        <History/>
                    </div>
                </div>
                <div className={styles.left}>
                    <div className={styles.settingTabs}>
                        <div>
                            <p onClick={() => setTab(0)}>board</p>
                            <p onClick={() => setTab(1)}>figures</p>
                        </div>
                    </div>
                    {tab === 0 && (
                        <div>
                            <BoardParametersForm/>
                            <div className={styles.arrays}>
                                <Conditions/>
                                <ConnectionsConditions/>
                            </div>
                        </div>
                    )}
                    {tab === 1 && (
                        <div>
                            <Figures/>
                        </div>
                    )}



                </div>

            </GameProvider>
        </div>
    )
}
