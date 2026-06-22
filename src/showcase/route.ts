export function isShowcaseRoute(pathname: string): boolean {
    if (!import.meta.env.DEV) {
        return false
    }

    return pathname.replace(/\/$/, '').endsWith('/components')
}
