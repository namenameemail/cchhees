import { describe, expect, it } from 'vitest'
import { isShowcaseRoute } from './route'

describe('isShowcaseRoute', () => {
    it('matches /components in dev', () => {
        expect(isShowcaseRoute('/components')).toBe(import.meta.env.DEV)
    })

    it('matches trailing slash', () => {
        expect(isShowcaseRoute('/components/')).toBe(import.meta.env.DEV)
    })

    it('does not match app root', () => {
        expect(isShowcaseRoute('/')).toBe(false)
    })
})
