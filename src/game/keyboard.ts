export function isKeyboardTargetEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false
    }

    const tag = target.tagName

    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true
    }

    return target.isContentEditable
}

const LETTER_KEY_CODES: Record<string, string> = Object.fromEntries(
    Array.from({ length: 26 }, (_, index) => {
        const letter = String.fromCharCode(97 + index)
        const code = `Key${letter.toUpperCase()}`

        return [letter, code]
    }),
)

/** Match Latin letter hotkeys by physical key (works on any keyboard layout). */
export function matchesPhysicalLetterKey(event: KeyboardEvent, letter: string): boolean {
    const normalized = letter.trim().toLowerCase()

    if (!normalized || normalized.length !== 1) {
        return false
    }

    const code = LETTER_KEY_CODES[normalized]

    return code ? event.code === code : false
}

export function isShiftKeyEvent(event: KeyboardEvent): boolean {
    return event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.key === 'Shift'
}
