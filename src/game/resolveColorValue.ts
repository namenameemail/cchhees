export function resolveColorValue(value?: string | null): string {
    if (value == null || value.trim() === '') {
        return 'transparent'
    }

    return value.trim()
}

export function resolveColorValueOrDefault(
    value: string | undefined | null,
    fallback: string,
): string {
    if (value == null) {
        return fallback
    }

    return resolveColorValue(value)
}
