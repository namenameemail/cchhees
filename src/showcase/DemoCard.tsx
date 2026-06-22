import React, { FC, ReactNode } from 'react'
import styles from './ComponentsCatalog.module.css'

export interface DemoCardProps {
    title: string
    usedIn: string
    state: unknown
    children: ReactNode
}

export const DemoCard: FC<DemoCardProps> = ({ title, usedIn, state, children }) => (
    <section className={styles.demoCard}>
        <header className={styles.demoHeader}>
            <h2 className={styles.demoTitle}>{title}</h2>
            <p className={styles.demoUsedIn}>{usedIn}</p>
        </header>
        <div className={styles.demoPreview}>
            {children}
        </div>
        <pre className={styles.demoState}>{JSON.stringify(state, null, 2)}</pre>
    </section>
)
