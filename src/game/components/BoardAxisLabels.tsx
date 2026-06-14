import React, { FC, useMemo } from 'react'
import { AxisLabelSide, BoardAxisSideSettings, BoardParameters } from '../types/boardParameters'
import { useFontAssetFamily } from '../../projects/assets/useFontAssetFamily'
import { useAssetHref } from '../../projects/assets/useAssetHref'
import {
    formatAxisLabel,
    getAxisSideBlockRange,
    getAxisSideBlockRect,
    getAxisSideFontSize,
    getAxisSideLabelTextAttrs,
    getAxisLabelGutters,
    getBoardContentSize,
    hasAxisSideBlockBackground,
    isAnyAxisSideEnabled,
    resolveAxisLabelsSettings,
} from '../boardAxisLabels'

export interface BoardAxisLabelsProps {
    boardParameters: BoardParameters
}

function useSideLabelStyle(
    boardParameters: BoardParameters,
    sideSettings: BoardAxisSideSettings,
    fontFamily: string | undefined,
) {
    return useMemo(() => ({
        fontSize: getAxisSideFontSize(boardParameters, sideSettings),
        fill: sideSettings.color ?? '#444444',
        fontFamily: fontFamily || 'sans-serif',
        userSelect: 'none' as const,
    }), [boardParameters, sideSettings, fontFamily])
}

interface SideBlockBackgroundProps {
    side: AxisLabelSide
    boardParameters: BoardParameters
    axisLabels: ReturnType<typeof resolveAxisLabelsSettings>
    gutters: ReturnType<typeof getAxisLabelGutters>
    contentSize: ReturnType<typeof getBoardContentSize>
}

const SideBlockBackground: FC<SideBlockBackgroundProps> = ({
    side,
    boardParameters,
    axisLabels,
    gutters,
    contentSize,
}) => {
    const sideSettings = axisLabels[side]
    const blockRect = useMemo(
        () => getAxisSideBlockRect(side, boardParameters, gutters, contentSize, sideSettings),
        [side, boardParameters, gutters, contentSize, sideSettings],
    )
    const assetUrl = useAssetHref(sideSettings.backgroundAssetId)

    if (!sideSettings.enabled || !blockRect || !hasAxisSideBlockBackground(sideSettings)) {
        return null
    }

    const fill = sideSettings.background?.trim() || 'transparent'

    return (
        <g key={`${side}-bg`}>
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
        </g>
    )
}

interface SideLabelsProps {
    side: AxisLabelSide
    boardParameters: BoardParameters
    axisLabels: ReturnType<typeof resolveAxisLabelsSettings>
    gutters: ReturnType<typeof getAxisLabelGutters>
    contentSize: ReturnType<typeof getBoardContentSize>
    labelStyle: React.CSSProperties
}

const SideLabels: FC<SideLabelsProps> = ({
    side,
    boardParameters,
    axisLabels,
    gutters,
    contentSize,
    labelStyle,
}) => {
    const sideSettings = axisLabels[side]
    const blockRange = useMemo(
        () => getAxisSideBlockRange(side, boardParameters, gutters, contentSize, sideSettings),
        [side, boardParameters, gutters, contentSize, sideSettings],
    )

    if (!sideSettings.enabled || !blockRange || blockRange.cellCount <= 0) {
        return null
    }

    const { startCellIndex, cellCount } = blockRange

    return (
        <>
            {Array.from({ length: cellCount }, (_, offset) => {
                const index = startCellIndex + offset
                const attrs = getAxisSideLabelTextAttrs(
                    side,
                    index,
                    boardParameters,
                    gutters,
                    contentSize,
                    sideSettings,
                )

                return (
                    <text
                        key={`${side}-${index}`}
                        x={attrs.x}
                        y={attrs.y}
                        textAnchor={attrs.textAnchor}
                        dominantBaseline={attrs.dominantBaseline}
                        style={labelStyle}
                    >
                        {formatAxisLabel(index, sideSettings.format)}
                    </text>
                )
            })}
        </>
    )
}

export const BoardAxisLabels: FC<BoardAxisLabelsProps> = ({ boardParameters }) => {
    const { n, m } = boardParameters

    const axisLabels = useMemo(
        () => resolveAxisLabelsSettings(boardParameters),
        [boardParameters],
    )
    const gutters = useMemo(() => getAxisLabelGutters(boardParameters), [boardParameters])
    const contentSize = useMemo(() => getBoardContentSize(boardParameters), [boardParameters])

    const topFontFamily = useFontAssetFamily(axisLabels.top.fontAssetId)
    const bottomFontFamily = useFontAssetFamily(axisLabels.bottom.fontAssetId)
    const leftFontFamily = useFontAssetFamily(axisLabels.left.fontAssetId)
    const rightFontFamily = useFontAssetFamily(axisLabels.right.fontAssetId)

    const topStyle = useSideLabelStyle(boardParameters, axisLabels.top, topFontFamily)
    const bottomStyle = useSideLabelStyle(boardParameters, axisLabels.bottom, bottomFontFamily)
    const leftStyle = useSideLabelStyle(boardParameters, axisLabels.left, leftFontFamily)
    const rightStyle = useSideLabelStyle(boardParameters, axisLabels.right, rightFontFamily)

    if (!isAnyAxisSideEnabled(axisLabels) || !n || !m) {
        return null
    }

    const sides: AxisLabelSide[] = ['top', 'bottom', 'left', 'right']

    return (
        <g pointerEvents="none" aria-hidden>
            {sides.map(side => (
                <SideBlockBackground
                    key={`${side}-background`}
                    side={side}
                    boardParameters={boardParameters}
                    axisLabels={axisLabels}
                    gutters={gutters}
                    contentSize={contentSize}
                />
            ))}
            <SideLabels
                side="top"
                boardParameters={boardParameters}
                axisLabels={axisLabels}
                gutters={gutters}
                contentSize={contentSize}
                labelStyle={topStyle}
            />
            <SideLabels
                side="bottom"
                boardParameters={boardParameters}
                axisLabels={axisLabels}
                gutters={gutters}
                contentSize={contentSize}
                labelStyle={bottomStyle}
            />
            <SideLabels
                side="left"
                boardParameters={boardParameters}
                axisLabels={axisLabels}
                gutters={gutters}
                contentSize={contentSize}
                labelStyle={leftStyle}
            />
            <SideLabels
                side="right"
                boardParameters={boardParameters}
                axisLabels={axisLabels}
                gutters={gutters}
                contentSize={contentSize}
                labelStyle={rightStyle}
            />
        </g>
    )
}
