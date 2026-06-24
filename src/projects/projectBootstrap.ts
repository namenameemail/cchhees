import { migrateProject, Project } from './types'
import { projectsBootstrapLog } from './projectsBootstrapLog'

export async function migrateRawProjects(
    rawProjects: Project[],
    migrateProjectInlineAssets: (project: Project) => Promise<Project>,
): Promise<{ loaded: Project[]; failedCount: number }> {
    let loaded: Project[] = []
    let failedCount = 0

    for (const project of rawProjects) {
        const format = project.boards?.length
            ? `multi-board(${project.boards.length})`
            : 'gameState' in project && project.gameState
                ? 'legacy-single'
                : 'unknown'

        projectsBootstrapLog.migrateAttempt({
            id: project.id,
            name: project.name,
            format,
            catalogFigures: project.figureCatalog?.length ?? 0,
        })

        try {
            const migrated = migrateProject(project)
            loaded.push(migrated)
            projectsBootstrapLog.migrateOk({
                id: migrated.id,
                name: migrated.name,
                boards: migrated.boards.length,
            })
        } catch (error) {
            failedCount += 1
            projectsBootstrapLog.migrateFailed(
                { id: project.id, name: project.name },
                error,
            )
        }
    }

    const migratedLoaded: Project[] = []

    for (const project of loaded) {
        try {
            migratedLoaded.push(await migrateProjectInlineAssets(project))
        } catch (error) {
            failedCount += 1
            projectsBootstrapLog.inlineAssetsFailed(
                { id: project.id, name: project.name },
                error,
            )
            migratedLoaded.push(project)
        }
    }

    return { loaded: migratedLoaded, failedCount }
}
