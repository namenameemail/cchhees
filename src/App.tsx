import { useState } from 'react'
import { Game } from './game'
import { ProjectProvider } from './projects/ProjectContext'
import { CollabProvider } from './collab/CollabProvider'
import { AssetsProvider } from './projects/assets/AssetsContext'
import { TopBar } from './projects/components/TopBar'
import { ProjectsModal } from './projects/components/ProjectsModal'
import styles from './App.module.css'

function App() {
    const [modalOpen, setModalOpen] = useState(false)

    return (
        <ProjectProvider>
            <CollabProvider>
                <AssetsProvider>
                    <TopBar onOpenProjects={() => setModalOpen(true)} />
                    <div className={styles.appBody}>
                        <Game />
                    </div>
                    <ProjectsModal
                        open={modalOpen}
                        onClose={() => setModalOpen(false)}
                    />
                </AssetsProvider>
            </CollabProvider>
        </ProjectProvider>
    )
}

export default App
