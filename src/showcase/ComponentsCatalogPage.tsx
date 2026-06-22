import React, { FC, useCallback, useMemo, useState } from 'react'
import {
    getDefaultShowcaseId,
    getShowcaseEntry,
    showcaseGroups,
    showcaseRegistry,
} from './showcaseRegistry'
import { ShowcaseGameShell } from './ShowcaseGameShell'
import styles from './ComponentsCatalog.module.css'

function readDemoIdFromSearch(): string {
    const params = new URLSearchParams(window.location.search)

    return params.get('demo') ?? getDefaultShowcaseId()
}

export const ComponentsCatalogPage: FC = () => {
    const [activeId, setActiveId] = useState(() => readDemoIdFromSearch())
    const entry = useMemo(() => getShowcaseEntry(activeId), [activeId])

    const handleSelect = useCallback((id: string) => {
        setActiveId(id)
        const url = new URL(window.location.href)
        url.searchParams.set('demo', id)
        window.history.replaceState(null, '', url)
    }, [])

    const Demo = entry.Demo
    const demoContent = entry.needsGameShell
        ? (
            <ShowcaseGameShell>
                <Demo />
            </ShowcaseGameShell>
        )
        : <Demo />

    return (
        <div className={styles.page}>
            <header className={styles.topBar}>
                <a className={styles.backLink} href="/">← приложение</a>
                <h1 className={styles.pageTitle}>Components</h1>
            </header>

            <div className={styles.layout}>
                <nav className={styles.sidebar}>
                    {showcaseGroups.map(group => (
                        <div key={group}>
                            <h2 className={styles.groupTitle}>{group}</h2>
                            <ul className={styles.navList}>
                                {showcaseRegistry
                                    .filter(item => item.group === group)
                                    .map(item => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                className={
                                                    item.id === activeId
                                                        ? `${styles.navItem} ${styles.navItemActive}`
                                                        : styles.navItem
                                                }
                                                onClick={() => handleSelect(item.id)}
                                            >
                                                {item.title}
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <main className={styles.content}>
                    {demoContent}
                </main>
            </div>
        </div>
    )
}
