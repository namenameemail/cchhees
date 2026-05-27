import { useEffect, useState } from 'react'

const aspectRatioCache = new Map<string, number>()

export function useAssetAspectRatio(href?: string): number {
    const [aspectRatio, setAspectRatio] = useState(() => {
        if (!href) {
            return 1
        }
        return aspectRatioCache.get(href) ?? 1
    })

    useEffect(() => {
        if (!href) {
            setAspectRatio(1)
            return
        }

        const cached = aspectRatioCache.get(href)
        if (cached != null) {
            setAspectRatio(cached)
            return
        }

        let cancelled = false
        const image = new Image()

        image.onload = () => {
            if (cancelled) {
                return
            }

            const nextAspectRatio = image.naturalWidth > 0 && image.naturalHeight > 0
                ? image.naturalWidth / image.naturalHeight
                : 1

            aspectRatioCache.set(href, nextAspectRatio)
            setAspectRatio(nextAspectRatio)
        }

        image.onerror = () => {
            if (!cancelled) {
                setAspectRatio(1)
            }
        }

        image.src = href

        return () => {
            cancelled = true
        }
    }, [href])

    return aspectRatio
}
