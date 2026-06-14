import React, { FC, useId, useMemo } from 'react'
import { BoardAxisNumbering, BoardParameters } from '../types/boardParameters'
import { useFontAssetFamily } from '../../projects/assets/useFontAssetFamily'
import { useAssetHref } from '../../projects/assets/useAssetHref'
import {
    getBoardBackgroundRect,
    getAxisNumberingFrameClipRadius,
    hasSurfaceAppearance,
    resolveAxisNumberingFrameAppearance,
    shouldClipAxisNumberingToFrame,
} from '../boardAppearance'
import { SurfaceBackgroundLayer, SurfaceBackgroundPattern } from './BoardBackground'
import {
    formatAxisNumberingLabel,
    getAxisNumberingBlockRect,
    getAxisNumberingCellRange,
    getAxisNumberingFontSize,
    getAxisNumberingLabelTextAttrs,
    getAxisLabelGutters,
    getBoardContentSize,
    getBoardPixelSize,
    hasAxisNumberingBlockBackground,
    isAnyAxisNumberingEnabled,
    resolveAxisNumberings,
} from '../boardAxisLabels'

export interface BoardAxisLabelsProps {
    boardParameters: BoardParameters
}

interface NumberingItemProps {
    item: BoardAxisNumbering
    index: number
    boardParameters: BoardParameters
    gutters: ReturnType<typeof getAxisLabelGutters>
    contentSize: ReturnType<typeof getBoardContentSize>
}

const NumberingItem: FC<NumberingItemProps> = ({
    item,
    index,
    boardParameters,
    gutters,
    contentSize,
}) => {
    const fontFamily = useFontAssetFamily(item.fontAssetId)
    const assetUrl = useAssetHref(item.backgroundAssetId)
    const range = useMemo(
        () => getAxisNumberingCellRange(item, boardParameters.n, boardParameters.m),
        [item, boardParameters.n, boardParameters.m],
    )
    const blockRect = useMemo(
        () => getAxisNumberingBlockRect(item, boardParameters, gutters, contentSize),
        [item, boardParameters, gutters, contentSize],
    )
    const labelStyle = useMemo(() => ({
        fontSize: getAxisNumberingFontSize(boardParameters, item),
        fill: item.color ?? '#444444',
        fontFamily: fontFamily || 'sans-serif',
        userSelect: 'none' as const,
    }), [boardParameters, item, fontFamily])

    if (!range || range.cellCount <= 0) {
        return null
    }

    const fill = item.background?.trim() || 'transparent'

    return (
        <g key={`numbering-${index}`}>
            {blockRect && hasAxisNumberingBlockBackground(item) && (
                <>
                    <rect
                        x={blockRect.x}
                        y={blockRect.y}
                        width={blockRect.width}
                        height={blockRect.height}
                        fill={fill}
                    />
                    {assetUrl && (
                        <image
                            href={assetUrl}
                            x={blockRect.x}
                            y={blockRect.y}
                            width={blockRect.width}
                            height={blockRect.height}
                            preserveAspectRatio="none"
                        />
                    )}
                </>
            )}
            {Array.from({ length: range.cellCount }, (_, offset) => {
                const cellIndex = range.startIndex + offset
                const attrs = getAxisNumberingLabelTextAttrs(
                    item,
                    cellIndex,
                    boardParameters,
                    gutters,
                    contentSize,
                )

                return (
                    <text
                        key={`${index}-${cellIndex}`}
                        x={attrs.x}
                        y={attrs.y}
                        textAnchor={attrs.textAnchor}
                        dominantBaseline={attrs.dominantBaseline}
                        style={labelStyle}
                    >
                        {formatAxisNumberingLabel(item, cellIndex, range)}
                    </text>
                )
            })}
        </g>
    )
}

function useAxisNumberingClip(boardParameters: BoardParameters) {
    const clipRadius = useMemo(
        () => getAxisNumberingFrameClipRadius(boardParameters),
        [boardParameters],
    )
    const shouldClip = useMemo(
        () => shouldClipAxisNumberingToFrame(boardParameters) && clipRadius > 0,
        [boardParameters, clipRadius],
    )

    return { clipRadius, shouldClip }
}

export interface BoardAxisNumberingFrameLayerProps {
    boardParameters: BoardParameters
    clipId?: string
    clipRadius?: number
}

export const BoardAxisNumberingFrameLayer: FC<BoardAxisNumberingFrameLayerProps> = ({
    boardParameters,
    clipId,
    clipRadius = 0,
}) => {
    const patternId = useId().replace(/:/g, '')
    const appearance = useMemo(
        () => resolveAxisNumberingFrameAppearance(boardParameters),
        [boardParameters],
    )
    const pixelSize = useMemo(
        () => getBoardPixelSize(boardParameters),
        [boardParameters],
    )
    const backgroundRect = useMemo(
        () => getBoardBackgroundRect(pixelSize.width, pixelSize.height, appearance),
        [pixelSize.width, pixelSize.height, appearance],
    )
    const shouldClip = clipRadius > 0 && clipId != null

    if (!hasSurfaceAppearance(boardParameters.axisNumberingFrame)) {
        return null
    }

    const frameContent = (
        <>
            <defs>
                <SurfaceBackgroundPattern
                    appearance={appearance}
                    backgroundRect={backgroundRect}
                    patternId={patternId}
                />
            </defs>
            <SurfaceBackgroundLayer
                appearance={appearance}
                backgroundRect={backgroundRect}
                patternId={patternId}
            />
        </>
    )

    return shouldClip ? (
        <g clipPath={`url(#${clipId})`}>
            {frameContent}
        </g>
    ) : frameContent
}

export interface BoardAxisNumberingItemsLayerProps {
    boardParameters: BoardParameters
    clipId?: string
    clipRadius?: number
}

export const BoardAxisNumberingItemsLayer: FC<BoardAxisNumberingItemsLayerProps> = ({
    boardParameters,
    clipId,
    clipRadius = 0,
}) => {
    const { n, m } = boardParameters
    const numberings = useMemo(
        () => resolveAxisNumberings(boardParameters),
        [boardParameters],
    )
    const gutters = useMemo(() => getAxisLabelGutters(boardParameters), [boardParameters])
    const contentSize = useMemo(() => getBoardContentSize(boardParameters), [boardParameters])
    const shouldClip = clipRadius > 0 && clipId != null

    if (!isAnyAxisNumberingEnabled(numberings) || !n || !m) {
        return null
    }

    const itemsContent = numberings.map((item, index) => (
        <NumberingItem
            key={index}
            item={item}
            index={index}
            boardParameters={boardParameters}
            gutters={gutters}
            contentSize={contentSize}
        />
    ))

    return (
        <g pointerEvents="none" aria-hidden>
            {shouldClip ? (
                <g clipPath={`url(#${clipId})`}>
                    {itemsContent}
                </g>
            ) : itemsContent}
        </g>
    )
}

export interface BoardAxisNumberingClipDefsProps {
    boardParameters: BoardParameters
    clipId: string
}

export const BoardAxisNumberingClipDefs: FC<BoardAxisNumberingClipDefsProps> = ({
    boardParameters,
    clipId,
}) => {
    const pixelSize = useMemo(
        () => getBoardPixelSize(boardParameters),
        [boardParameters],
    )
    const clipRadius = useMemo(
        () => getAxisNumberingFrameClipRadius(boardParameters),
        [boardParameters],
    )

    if (clipRadius <= 0 || !shouldClipAxisNumberingToFrame(boardParameters)) {
        return null
    }

    return (
        <clipPath id={clipId} data-export-clip="outer">
            <rect
                width={pixelSize.width}
                height={pixelSize.height}
                rx={clipRadius}
                ry={clipRadius}
            />
        </clipPath>
    )
}

export const BoardAxisLabels: FC<BoardAxisLabelsProps> = ({ boardParameters }) => {
    const clipId = useId().replace(/:/g, '')
    const { clipRadius, shouldClip } = useAxisNumberingClip(boardParameters)

    return (
        <g pointerEvents="none" aria-hidden>
            {shouldClip && (
                <defs>
                    <BoardAxisNumberingClipDefs boardParameters={boardParameters} clipId={clipId} />
                </defs>
            )}
            <BoardAxisNumberingFrameLayer
                boardParameters={boardParameters}
                clipId={clipId}
                clipRadius={shouldClip ? clipRadius : 0}
            />
            <BoardAxisNumberingItemsLayer
                boardParameters={boardParameters}
                clipId={clipId}
                clipRadius={shouldClip ? clipRadius : 0}
            />
        </g>
    )
}
