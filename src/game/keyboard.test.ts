import { describe, expect, it } from 'vitest'
import { isShiftKeyEvent, matchesPhysicalLetterKey } from './keyboard'

function keyboardEvent(
    partial: Pick<KeyboardEvent, 'code' | 'key'>,
): KeyboardEvent {
    return partial as KeyboardEvent
}

describe('matchesPhysicalLetterKey', () => {
    it('matches physical E when Russian layout produces у', () => {
        expect(matchesPhysicalLetterKey(
            keyboardEvent({ code: 'KeyE', key: 'у' }),
            'e',
        )).toBe(true)
    })

    it('matches physical R when Russian layout produces к', () => {
        expect(matchesPhysicalLetterKey(
            keyboardEvent({ code: 'KeyR', key: 'к' }),
            'r',
        )).toBe(true)
    })

    it('does not match different physical key', () => {
        expect(matchesPhysicalLetterKey(
            keyboardEvent({ code: 'KeyQ', key: 'й' }),
            'e',
        )).toBe(false)
    })
})

describe('isShiftKeyEvent', () => {
    it('detects Shift by code', () => {
        expect(isShiftKeyEvent(keyboardEvent({ code: 'ShiftLeft', key: 'Shift' }))).toBe(true)
    })
})
