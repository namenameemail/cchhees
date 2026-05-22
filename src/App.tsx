import { useState } from 'react'
import { Game } from './game'
import { ProjectProvider } from './projects/ProjectContext'
import { TopBar } from './projects/components/TopBar'
import { ProjectsModal } from './projects/components/ProjectsModal'
import styles from './App.module.css'

function App() {
    const [modalOpen, setModalOpen] = useState(false)

    return (
        <ProjectProvider>
            <TopBar onOpenProjects={() => setModalOpen(true)} />
            <div className={styles.appBody}>
                <Game />
            </div>
            <ProjectsModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </ProjectProvider>
    )
}

export default App
