import { useMemo } from 'react'
import { BoardParameters } from '../types/boardParameters'
import {
    getBoardBackgroundImageLayout,
    resolveBoardAppearance,
    useAssetImageSize,
} from '../boardAppearance'
import { useAssetHref } from '../../projects/assets/useAssetHref'

function useBoardBackgroundImage(
    boardParameters: BoardParameters,
    areaWidth: number,
    areaHeight: number,
) {
    const appearance = useMemo(
        () => resolveBoardAppearance(boardParameters),
        [boardParameters],
    )
    const assetUrl = useAssetHref(appearance.backgroundAssetId)
    const imageSize = useAssetImageSize(assetUrl)

    const imageLayout = useMemo(() => {
        if (!assetUrl || !imageSize) {
            return null
        }

        return getBoardBackgroundImageLayout(
            areaWidth,
            areaHeight,
            imageSize.width,
            imageSize.height,
            appearance.backgroundImageFit,
            {
                width: appearance.backgroundRepeatWidth,
                height: appearance.backgroundRepeatHeight,
                offsetX: appearance.backgroundRepeatOffsetX,
                offsetY: appearance.backgroundRepeatOffsetY,
            },
        )
    }, [appearance, assetUrl, imageSize, areaWidth, areaHeight])

    return { appearance, assetUrl, imageLayout }
}

export interface BoardBackgroundPatternProps {
    boardParameters: BoardParameters
    backgroundRect: ReturnType<typeof import('../boardAppearance').getBoardBackgroundRect>
    patternId: string
}

export function BoardBackgroundPattern({
    boardParameters,
    backgroundRect,
    patternId,
}: BoardBackgroundPatternProps) {
    const { assetUrl, imageLayout } = useBoardBackgroundImage(
        boardParameters,
        backgroundRect.width,
        backgroundRect.height,
    )

    if (imageLayout?.mode !== 'pattern' || !assetUrl) {
        return null
    }

    return (
        <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={imageLayout.patternWidth}
            height={imageLayout.patternHeight}
            x={imageLayout.offsetX}
            y={imageLayout.offsetY}
        >
            <image
                href={assetUrl}
                width={imageLayout.imageWidth}
                height={imageLayout.imageHeight}
                preserveAspectRatio="none"
            />
        </pattern>
    )
}

export interface BoardBackgroundLayerProps {
    boardParameters: BoardParameters
    backgroundRect: ReturnType<typeof import('../boardAppearance').getBoardBackgroundRect>
    patternId: string
}

export function BoardBackgroundLayer({
    boardParameters,
    backgroundRect,
    patternId,
}: BoardBackgroundLayerProps) {
    const { assetUrl, imageLayout } = useBoardBackgroundImage(
        boardParameters,
        backgroundRect.width,
        backgroundRect.height,
    )

    const imageArea = {
        x: backgroundRect.x,
        y: backgroundRect.y,
        width: backgroundRect.width,
        height: backgroundRect.height,
        rx: backgroundRect.rx,
        ry: backgroundRect.ry,
    }

    return (
        <>
            <rect {...backgroundRect} />
            {imageLayout?.mode === 'pattern' && (
                <rect
                    {...imageArea}
                    fill={`url(#${patternId})`}
                />
            )}
            {imageLayout?.mode === 'single' && assetUrl && (
                <image
                    href={assetUrl}
                    x={backgroundRect.x + imageLayout.x}
                    y={backgroundRect.y + imageLayout.y}
                    width={imageLayout.width}
                    height={imageLayout.height}
                    preserveAspectRatio="none"
                />
            )}
        </>
    )
}
