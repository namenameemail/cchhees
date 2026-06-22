import React, { forwardRef, useCallback, useId, useMemo, useState } from 'react'
import { useGameContext } from '../context'
import { BoardCell } from './BoardCell'
import { getConnections } from '../context/connections'
import { ConnectionSVGGroup } from './ConnectionSVGGroup'
import { CellSVGGroup } from './CellSVGGroup'
import { CellCoord, coordKey, coordsEqual, iterGridCoords, coordToIndex, indexToCoord } from '../types/coords'
import { FigureId } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import {
    buildStyleRuleDrawPlan,
    findConnectionDataByKey,
} from '../styleRules/evaluate'
import { isCellStyleRule, isConnectionStyleRule } from '../types/styleRules'
import { Mode } from '../types'
import { resolveFigureDefinition } from '../figureView'
import { getCellStack } from '../figureStack'
import { getLegalMoveDestinations } from '../moveRules'
import { resolveBoardMarks } from '../boardMarks'
import {
    getBoardBackgroundRect,
    getAxisNumberingFrameClipRadius,
    resolveBoardAppearance,
    shouldClipAxisNumberingToFrame,
} from '../boardAppearance'
import {
    getBoardContentSize,
    getBoardPixelSize,
    getAxisLabelGutters,
    isAnyAxisNumberingEnabled,
    resolveAxisNumberings,
} from '../boardAxisLabels'
import { BoardMarkGradientDefs } from './BoardMarkGradientDefs'
import { BoardBackgroundLayer, BoardBackgroundPattern } from './BoardBackground'
import { BoardAxisNumberingClipDefs,
    BoardAxisNumberingFrameLayer,
    BoardAxisNumberingItemsLayer,
} from './BoardAxisLabels'
import { BoardFigureAnimationsLayer } from './BoardFigureAnimationsLayer'
import { BoardAboveMarksLayer } from './BoardAboveMarksLayer'

export interface BoardProps {
    className?: string
}

export const Board = forwardRef<SVGSVGElement, BoardProps>(function Board({ className }, ref) {

    const { state, figuresSlice, mode, activeCell, figureCatalog, figureTeams, previewCellStyleRuleIndex, figureBoardAnimations, isFreeMoveEnabled } = useGameContext()
    const selectionGradientId = useId().replace(/:/g, '')
    const selectionOverlayGradientId = useId().replace(/:/g, '')
    const legalMoveGradientId = useId().replace(/:/g, '')
    const legalMoveOverlayGradientId = useId().replace(/:/g, '')
    const cursorGradientId = useId().replace(/:/g, '')
    const cursorOverlayGradientId = useId().replace(/:/g, '')
    const boardClipId = useId().replace(/:/g, '')
    const backgroundPatternId = useId().replace(/:/g, '')
    const numberingClipId = useId().replace(/:/g, '')

    const {
        boardParameters,
        styleRules,
        cells,
    } = state

    const {
        n,
        m,
        cellXDistance,
        cellYDistance,
    } = boardParameters

    const axisGutters = useMemo(
        () => getAxisLabelGutters(boardParameters),
        [boardParameters],
    )

    const boardContentSize = useMemo(
        () => getBoardContentSize(boardParameters),
        [boardParameters],
    )

    const boardStyle = useMemo(
        () => getBoardPixelSize(boardParameters),
        [boardParameters],
    )

    const appearance = useMemo(
        () => resolveBoardAppearance(boardParameters),
        [boardParameters],
    )

    const boardMarks = useMemo(
        () => resolveBoardMarks(boardParameters),
        [boardParameters],
    )

    const markGradientIds = useMemo(() => ({
        selection: boardMarks.selection.fill.type === 'solid' || boardMarks.selection.fill.type === 'none'
            ? undefined
            : selectionGradientId,
        selectionOverlay: boardMarks.selection.overlay?.fill?.type === 'linear'
            || boardMarks.selection.overlay?.fill?.type === 'radial'
            ? selectionOverlayGradientId
            : undefined,
        legalMove: boardMarks.legalMove.fill.type === 'solid' || boardMarks.legalMove.fill.type === 'none'
            ? undefined
            : legalMoveGradientId,
        legalMoveOverlay: boardMarks.legalMove.overlay?.fill?.type === 'linear'
            || boardMarks.legalMove.overlay?.fill?.type === 'radial'
            ? legalMoveOverlayGradientId
            : undefined,
        cursor: boardMarks.cursor.fill.type === 'solid' || boardMarks.cursor.fill.type === 'none'
            ? undefined
            : cursorGradientId,
        cursorOverlay: boardMarks.cursor.overlay?.fill?.type === 'linear'
            || boardMarks.cursor.overlay?.fill?.type === 'radial'
            ? cursorOverlayGradientId
            : undefined,
    }), [
        boardMarks,
        selectionGradientId,
        selectionOverlayGradientId,
        legalMoveGradientId,
        legalMoveOverlayGradientId,
        cursorGradientId,
        cursorOverlayGradientId,
    ])

    const connections = useMemo(() => {
        return (n && m) ? getConnections(n, m) : {}
    }, [n, m])

    const backgroundRect = useMemo(
        () => getBoardBackgroundRect(boardContentSize.width, boardContentSize.height, appearance),
        [boardContentSize.width, boardContentSize.height, appearance],
    )

    const boardTransform = axisGutters.left > 0 || axisGutters.top > 0
        ? `translate(${axisGutters.left}, ${axisGutters.top})`
        : undefined

    const boardClipPath = appearance.borderRadius > 0
        ? `url(#${boardClipId})`
        : undefined

    const drawPlan = useMemo(() => {
        if (!n || !m) {
            return { cellLayers: new Map(), connectionLayers: new Map() }
        }

        return buildStyleRuleDrawPlan(styleRules, n, m)
    }, [styleRules, n, m])

    const previewCellCoords = useMemo(() => {
        if (previewCellStyleRuleIndex === undefined) {
            return []
        }

        const rule = styleRules[previewCellStyleRuleIndex]

        if (!rule || !isCellStyleRule(rule)) {
            return []
        }

        return drawPlan.cellLayers.get(previewCellStyleRuleIndex) ?? []
    }, [previewCellStyleRuleIndex, styleRules, drawPlan])

    const legalMoveKeys = useMemo(() => {
        if (mode !== Mode.Game || activeCell === undefined) {
            return new Set<string>()
        }

        const cellIndex = coordToIndex(activeCell, n)
        const cell = state.cells[cellIndex]
        const stack = getCellStack(cell)
        const placement = stack[stack.length - 1]

        if (!placement) {
            return new Set<string>()
        }

        const definition = resolveFigureDefinition(placement.figureId, figureCatalog ?? state.figureCatalog)

        return new Set(
            getLegalMoveDestinations(
                activeCell,
                definition,
                figuresSlice.figuresByCoord,
                state.boardParameters,
                placement,
                figureCatalog ?? state.figureCatalog,
                isFreeMoveEnabled,
                figureTeams,
            ).map(coordKey),
        )
    }, [mode, activeCell, figuresSlice.figuresByCoord, state.boardParameters, n, figureCatalog, state.figureCatalog, isFreeMoveEnabled, figureTeams])

    const numberingClipRadius = useMemo(
        () => getAxisNumberingFrameClipRadius(boardParameters),
        [boardParameters],
    )
    const numberingShouldClip = useMemo(
        () => shouldClipAxisNumberingToFrame(boardParameters) && numberingClipRadius > 0,
        [boardParameters, numberingClipRadius],
    )
    const hasNumberings = useMemo(
        () => isAnyAxisNumberingEnabled(resolveAxisNumberings(boardParameters)),
        [boardParameters],
    )

    const [hoveredCoord, setHoveredCoord] = useState<CellCoord | undefined>()

    const handleCellHoverChange = useCallback((coord: CellCoord, hovered: boolean) => {
        setHoveredCoord(hovered ? coord : undefined)
    }, [])

    return (
        <svg ref={ref} style={boardStyle} className={className}>
            <defs>
                {appearance.borderRadius > 0 && (
                    <clipPath id={boardClipId}>
                        <rect
                            width={boardContentSize.width}
                            height={boardContentSize.height}
                            rx={appearance.borderRadius}
                            ry={appearance.borderRadius}
                        />
                    </clipPath>
                )}
                <BoardMarkGradientDefs
                    boardMarks={boardMarks}
                    selectionGradientId={selectionGradientId}
                    selectionOverlayGradientId={selectionOverlayGradientId}
                    legalMoveGradientId={legalMoveGradientId}
                    legalMoveOverlayGradientId={legalMoveOverlayGradientId}
                    cursorGradientId={cursorGradientId}
                    cursorOverlayGradientId={cursorOverlayGradientId}
                />
                {numberingShouldClip && (
                    <BoardAxisNumberingClipDefs
                        boardParameters={boardParameters}
                        clipId={numberingClipId}
                    />
                )}
                <BoardBackgroundPattern
                    boardParameters={boardParameters}
                    backgroundRect={backgroundRect}
                    patternId={backgroundPatternId}
                />
            </defs>
            {hasNumberings && (
                <BoardAxisNumberingFrameLayer
                    boardParameters={boardParameters}
                    clipId={numberingClipId}
                    clipRadius={numberingShouldClip ? numberingClipRadius : 0}
                />
            )}
            <g clipPath={boardClipPath} transform={boardTransform}>
            <BoardBackgroundLayer
                boardParameters={boardParameters}
                backgroundRect={backgroundRect}
                patternId={backgroundPatternId}
            />
            {styleRules.map((rule, ruleIndex) => (
                <g key={ruleIndex}>
                    {isCellStyleRule(rule) && drawPlan.cellLayers.get(ruleIndex)?.map((coord) => (
                        <CellSVGGroup
                            key={coordKey(coord)}
                            x={coord.i * cellXDistance + cellXDistance / 2}
                            y={coord.j * cellYDistance + cellYDistance / 2}
                            cellParams={rule.cellParams}
                        />
                    ))}
                    {isConnectionStyleRule(rule) && drawPlan.connectionLayers.get(ruleIndex)?.map((connectionKey) => {
                        const data = findConnectionDataByKey(connections, connectionKey)

                        if (!data) {
                            return null
                        }

                        const xFrom = data.iFrom * cellXDistance + cellXDistance / 2
                        const yFrom = data.jFrom * cellYDistance + cellYDistance / 2
                        const xTo = data.iTo * cellXDistance + cellXDistance / 2
                        const yTo = data.jTo * cellYDistance + cellYDistance / 2

                        return (
                            <ConnectionSVGGroup
                                key={connectionKey}
                                x1={xFrom}
                                y1={yFrom}
                                x2={xTo}
                                y2={yTo}
                                connectionParams={rule.connectionParams}
                            />
                        )
                    })}
                </g>
            ))}
            {previewCellCoords.length > 0 && (
                <g pointerEvents="none">
                    {previewCellCoords.map((coord) => (
                        <rect
                            key={coordKey(coord)}
                            x={coord.i * cellXDistance}
                            y={coord.j * cellYDistance}
                            width={cellXDistance}
                            height={cellYDistance}
                            fill="#0088ff44"
                            stroke="#ffffffaa"
                            strokeWidth={1}
                        />
                    ))}
                </g>
            )}
            {iterGridCoords(n, m).map((coord) => {
                const index = coord.j * n + coord.i
                return (
                    <BoardCell
                        key={coordKey(coord)}
                        cell={cells[index]}
                        coord={coord}
                        boardMarks={boardMarks}
                        gradientIds={markGradientIds}
                        isLegalMove={legalMoveKeys.has(coordKey(coord))}
                        isHovered={hoveredCoord !== undefined && coordsEqual(hoveredCoord, coord)}
                        onHoverChange={(hovered) => handleCellHoverChange(coord, hovered)}
                        hiddenFigureInstanceIds={figureBoardAnimations.hiddenInstanceIds}
                    />
                )
            })}
            <BoardAboveMarksLayer
                n={n}
                m={m}
                cellXDistance={cellXDistance}
                cellYDistance={cellYDistance}
                boardMarks={boardMarks}
                gradientIds={markGradientIds}
                activeCell={activeCell}
                legalMoveKeys={legalMoveKeys}
                hoveredCoord={hoveredCoord}
            />
            <BoardFigureAnimationsLayer items={figureBoardAnimations.overlayItems} />
            </g>
            {hasNumberings && (
                <BoardAxisNumberingItemsLayer
                    boardParameters={boardParameters}
                    clipId={numberingClipId}
                    clipRadius={numberingShouldClip ? numberingClipRadius : 0}
                />
            )}
        </svg>
    )
})
