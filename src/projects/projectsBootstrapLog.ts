import { getDbInfo } from './db'

const PREFIX = '[projects]'

function log(message: string, ...args: unknown[]): void {
    console.log(`${PREFIX} ${message}`, ...args)
}

function formatError(error: unknown): { detail: string; stack?: string } {
    if (error instanceof Error) {
        return {
            detail: `${error.name}: ${error.message}`,
            stack: error.stack,
        }
    }

    return { detail: String(error) }
}

function logOriginContext(): void {
    const { name, version } = getDbInfo()
    const origin = typeof location !== 'undefined' ? location.origin : 'unknown'
    log(`context: origin=${origin} db=${name} v${version}`)
}

export const projectsBootstrapLog = {
    moduleLoaded(): void {
        logOriginContext()
        log('logger loaded — ищите строки с префиксом [projects] в Console (уровень Default/Info)')
    },

    start(generation: number): void {
        logOriginContext()
        log(`bootstrap start (gen=${generation})`)
    },

    fetchedFromDb(rawCount: number, ids: Array<{ id: string; name: string; updatedAt: number }>): void {
        log(`indexedDB «cchhees».projects: ${rawCount} записей`)

        if (rawCount === 0) {
            log('в IndexedDB нет проектов — будет проверка резервной копии или создан пустой')
        }

        for (const item of ids) {
            log(`  db · ${item.id.slice(0, 8)} «${item.name}» updated=${item.updatedAt}`)
        }
    },

    migrateAttempt(project: {
        id: string
        name: string
        format: string
        catalogFigures: number
    }): void {
        log(
            `migrate… ${project.id.slice(0, 8)} «${project.name}» format=${project.format} catalog=${project.catalogFigures}`,
        )
    },

    migrateOk(project: { id: string; name: string; boards: number }): void {
        log(`migrate ok: ${project.id.slice(0, 8)} «${project.name}» boards=${project.boards}`)
    },

    migrateFailed(project: { id: string; name: string }, error: unknown): void {
        const { detail, stack } = formatError(error)

        console.error(`${PREFIX} migrate FAILED: ${project.id} «${project.name}» — ${detail}`, error)

        if (stack) {
            console.error(`${PREFIX} stack:`, stack)
        }
    },

    inlineAssetsFailed(project: { id: string; name: string }, error: unknown): void {
        const { detail, stack } = formatError(error)

        console.error(`${PREFIX} inline assets FAILED: ${project.id} «${project.name}» — ${detail}`, error)

        if (stack) {
            console.error(`${PREFIX} stack:`, stack)
        }
    },

    summary(rawCount: number, loadedCount: number, failedCount: number): void {
        log(`summary: db=${rawCount} loaded=${loadedCount} failed=${failedCount}`)

        if (failedCount > 0) {
            console.error(
                `${PREFIX} ${failedCount} проект(ов) не загружены из-за ошибки миграции — данные остались в IndexedDB`,
            )
        }

        if (rawCount > 0 && loadedCount === 0) {
            console.error(`${PREFIX} все проекты упали при миграции — см. migrate FAILED выше`)
        }
    },

    createdFallbackEmpty(name: string): void {
        console.warn(
            `${PREFIX} ⚠ создан пустой fallback «${name}» — проверьте origin=${typeof location !== 'undefined' ? location.origin : '?'} и резервные копии`,
        )
        log(`ни один проект не загрузился — создан пустой «${name}»`)
    },

    autoRecovery(restoredCount: number, backupId: string, lastKnownCount: number): void {
        console.warn(
            `${PREFIX} ⚠ auto-recovery: восстановлено ${restoredCount} проект(ов) из backup ${backupId.slice(0, 8)} (lastKnown=${lastKnownCount})`,
        )
    },

    backupWritten(count: number, backupId: string): void {
        log(`backup saved: ${count} project(s) id=${backupId.slice(0, 8)}`)
    },

    dbReadFailed(error: unknown, store?: string): void {
        const { detail, stack } = formatError(error)
        const storePart = store ? ` store=${store}` : ''
        console.error(`${PREFIX} DB read/open FAILED${storePart} — ${detail}`, error)

        if (stack) {
            console.error(`${PREFIX} stack:`, stack)
        }
    },

    schemaIncomplete(missing: string[]): void {
        console.error(`${PREFIX} DB schema incomplete — missing stores: ${missing.join(', ')}`)
    },

    bootstrapFailed(error: unknown): void {
        const { detail, stack } = formatError(error)

        console.error(`${PREFIX} bootstrap FAILED — ${detail}`, error)

        if (stack) {
            console.error(`${PREFIX} stack:`, stack)
        }
    },

    bootstrapCancelled(generation: number): void {
        log(`bootstrap gen=${generation} отменён (StrictMode / remount)`)
    },

    ready(activeId: string, loadedCount: number, visitedRooms: number): void {
        log(`ready: active=${activeId.slice(0, 8)} projects=${loadedCount} visited=${visitedRooms}`)
    },

    uiState(isReady: boolean, projectsCount: number, modalOpen: boolean): void {
        log(`UI: isReady=${isReady} projectsInState=${projectsCount} modalOpen=${modalOpen}`)
    },
}

projectsBootstrapLog.moduleLoaded()

if (import.meta.env.DEV) {
    ;(globalThis as typeof globalThis & { __projectsBootstrapLog?: typeof projectsBootstrapLog }).__projectsBootstrapLog
        = projectsBootstrapLog
}
