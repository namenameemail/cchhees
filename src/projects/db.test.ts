import { describe, expect, it } from 'vitest'
import {
    checkDbSchema,
    formatDbOperationError,
    formatDbSchemaError,
    REQUIRED_OBJECT_STORES,
} from './dbSchema'

describe('dbSchema helpers', () => {
    it('formatDbSchemaError mentions missing stores', () => {
        expect(formatDbSchemaError(['backups', 'assets'])).toContain('backups, assets')
    })

    it('formatDbOperationError maps missing store transaction error', () => {
        const message = formatDbOperationError(
            new DOMException('One of the specified object stores was not found.', 'NotFoundError'),
            'backups',
        )

        expect(message).toContain('store «backups»')
        expect(message).toContain('Ctrl+Shift+R')
    })

    it('checkDbSchema lists missing stores', () => {
        const fakeDb = {
            objectStoreNames: {
                contains(name: string) {
                    return name === 'projects' || name === 'meta'
                },
            },
        }

        const result = checkDbSchema(fakeDb)

        expect(result.ok).toBe(false)

        if (!result.ok) {
            expect(result.missing).toEqual(
                REQUIRED_OBJECT_STORES.filter(name => name !== 'projects' && name !== 'meta'),
            )
        }
    })

    it('checkDbSchema passes when all stores exist', () => {
        const fakeDb = {
            objectStoreNames: {
                contains(name: string) {
                    return REQUIRED_OBJECT_STORES.includes(name as typeof REQUIRED_OBJECT_STORES[number])
                },
            },
        }

        expect(checkDbSchema(fakeDb)).toEqual({ ok: true })
    })
})
