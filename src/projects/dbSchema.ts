export const DB_NAME = 'cchhees'
export const DB_VERSION = 7

export const REQUIRED_OBJECT_STORES = [
    'projects',
    'meta',
    'assets',
    'visitedRooms',
    'backups',
] as const

export type RequiredObjectStore = typeof REQUIRED_OBJECT_STORES[number]

export type DbSchemaCheckResult =
    | { ok: true }
    | { ok: false; missing: RequiredObjectStore[] }

export function checkDbSchema(db: { objectStoreNames: { contains(name: string): boolean } }): DbSchemaCheckResult {
    const missing = REQUIRED_OBJECT_STORES.filter(name => !db.objectStoreNames.contains(name))

    if (missing.length > 0) {
        return { ok: false, missing: [...missing] }
    }

    return { ok: true }
}

export function formatDbSchemaError(missing: RequiredObjectStore[]): string {
    return `IndexedDB «${DB_NAME}»: отсутствуют object stores: ${missing.join(', ')}. Перезагрузите страницу (Ctrl+Shift+R). Если не помогло — удалите базу «${DB_NAME}» в DevTools → Application → IndexedDB.`
}

export function formatDbOperationError(error: unknown, store?: RequiredObjectStore): string {
    const message = error instanceof Error ? error.message : String(error)
    const storePart = store ? ` (store «${store}»)` : ''

    if (message.includes('object stores was not found') || message.includes('NotFoundError')) {
        return `IndexedDB${storePart}: store не найден — база повреждена или очищена без перезагрузки. Перезагрузите страницу (Ctrl+Shift+R) или удалите базу «${DB_NAME}» в DevTools → Application → IndexedDB.`
    }

    if (message.includes('large IndexedDB value')) {
        return `IndexedDB${storePart}: запись слишком большая для чтения. Экспортируйте проект в файл или удалите тяжёлые бэкапы/ассеты в DevTools.`
    }

    return message
}
