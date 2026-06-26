import React, { FC, useMemo } from 'react'
import { useProjectContext } from '../ProjectContext'
import styles from './BootstrapErrorBanner.module.css'

function resolveBootstrapHint(message: string): string {
    if (message.includes('store не найден') || message.includes('object stores')) {
        return 'После очистки IndexedDB в DevTools перезагрузите страницу (Ctrl+Shift+R). Если ошибка остаётся — удалите базу «cchhees» целиком и импортируйте проект из файла .cchhees.'
    }

    if (message.includes('слишком большая')) {
        return 'Удалите store «backups» в DevTools или очистите тяжёлые ассеты. Экспорт проекта в файл — надёжнее, чем полагаться только на IndexedDB.'
    }

    return 'Проверьте origin в адресной строке, перезагрузите страницу или восстановите проект из резервной копии / файла .cchhees в модалке проектов.'
}

export const BootstrapErrorBanner: FC = () => {
    const { bootstrapError, retryBootstrap } = useProjectContext()

    const hint = useMemo(
        () => (bootstrapError ? resolveBootstrapHint(bootstrapError) : ''),
        [bootstrapError],
    )

    if (!bootstrapError) {
        return null
    }

    return (
        <div className={styles.banner} role="alert">
            <div className={styles.content}>
                <strong>Не удалось загрузить проекты</strong>
                <p>{bootstrapError}</p>
                <p className={styles.hint}>{hint}</p>
            </div>
            <button type="button" className={styles.retryButton} onClick={retryBootstrap}>
                Повторить
            </button>
        </div>
    )
}
