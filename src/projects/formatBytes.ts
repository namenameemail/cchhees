export function formatBytes(size: number): string {
    if (size < 1024) {
        return `${size} B`
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function formatMegabytes(size: number): string {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
}
