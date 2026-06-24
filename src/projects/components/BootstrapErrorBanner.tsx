import React, { FC } from 'react'
import { useProjectContext } from '../ProjectContext'
import styles from './BootstrapErrorBanner.module.css'

export const BootstrapErrorBanner: FC = () => {
    const { bootstrapError, retryBootstrap } = useProjectContext()

    if (!bootstrapError) {
        return null
    }

    return (
        <div className={styles.banner} role="alert">
            <div className={styles.content}>
                <strong>Не удалось загрузить проекты</strong>
                <p>{bootstrapError}</p>
                <p className={styles.hint}>
                    Данные в IndexedDB не удалены. Проверьте origin в адресной строке или восстановите из резервной копии в модалке проектов.
                </p>
            </div>
            <button type="button" className={styles.retryButton} onClick={retryBootstrap}>
                Повторить
            </button>
        </div>
    )
}
