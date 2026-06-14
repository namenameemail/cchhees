import React, { forwardRef, useId, useMemo } from 'react'
import { useGameContext } from '../context'
import { BoardCell } from './BoardCell'
import { getConnections } from '../context/connections'
import { ConnectionSVGGroup } from './ConnectionSVGGroup'
import { CellSVGGroup } from './CellSVGGroup'
import { coordKey, iterGridCoords, coordToIndex, indexToCoord } from '../types/coords'
import { FigureId } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import {
    buildStyleRuleDrawPlan,
    findConnectionDataByKey,
} from '../styleRules/evaluate'
import { isCellStyleRule, isConnectionStyleRule } from '../types/styleRules'
import { Mode } from '../types'
import { resolveFigureDefinition } from '../figureView'
import { getLegalMoveDestinations } from '../moveRules'
import {
    getBoardBackgroundRect,
    resolveBoardAppearance,
} from '../boardAppearance'
import { BoardBackgroundLayer, BoardBackgroundPattern } from './BoardBackground'

export interface BoardProps {
    className?: string
}

export const Board = forwardRef<SVGSVGElement, BoardProps>(function Board({ className }, ref) {

    const { state, mode, activeCell, figureCatalog, previewCellStyleRuleIndex } = useGameContext()
    const selectionGradientId = useId().replace(/:/g, '')
    const legalMoveGradientId = useId().replace(/:/g, '')
    const boardClipId = useId().replace(/:/g, '')
    const backgroundPatternId = useId().replace(/:/g, '')

    const {
        boardParameters,
        styleRules,
        cells,
    } = state

    const {
        n,
        m,
        cellHeight,
        cellWidth,
        cellXDistance,
        cellYDistance,
    } = boardParameters

    const appearance = useMemo(
        () => resolveBoardAppearance(boardParameters),
        [boardParameters],
    )

    const connections = useMemo(() => {
        return (n && m) ? getConnections(n, m) : {}
    }, [n, m])

    const boardStyle = useMemo(() => ({
        width: n * cellXDistance,
        height: m * cellYDistance,
    }), [n, m, cellXDistance, cellYDistance])

    const backgroundRect = useMemo(
        () => getBoardBackgroundRect(boardStyle.width, boardStyle.height, appearance),
        [boardStyle.width, boardStyle.height, appearance],
    )

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
        const placement = state.cells[cellIndex]?.figure

        if (!placement) {
            return new Set<string>()
        }

        const definition = resolveFigureDefinition(placement.figureId, figureCatalog ?? state.figureCatalog)

        const figuresByCoord: FiguresSlice['figuresByCoord'] = {}
        for (const [index, cell] of state.cells.entries()) {
            if (cell.figure) {
                figuresByCoord[coordKey(indexToCoord(index, n))] = cell.figure
            }
        }

        return new Set(
            getLegalMoveDestinations(
                activeCell,
                definition,
                figuresByCoord,
                state.boardParameters,
                placement,
            ).map(coordKey),
        )
    }, [mode, activeCell, state.cells, state.tray, state.boardParameters, n, figureCatalog, state.figureCatalog])

    return (
        <svg ref={ref} style={boardStyle} className={className}>
            <defs>
                {appearance.borderRadius > 0 && (
                    <clipPath id={boardClipId}>
                        <rect
                            width={boardStyle.width}
                            height={boardStyle.height}
                            rx={appearance.borderRadius}
                            ry={appearance.borderRadius}
                        />
                    </clipPath>
                )}
                <radialGradient id={selectionGradientId}>
                    <stop offset="5%" stopColor="#ff00FF99" />
                    <stop offset="95%" stopColor="#ff000000" />
                </radialGradient>
                <radialGradient id={legalMoveGradientId}>
                    <stop offset="5%" stopColor="#00aa4455" />
                    <stop offset="95%" stopColor="#00aa4400" />
                </radialGradient>
                <BoardBackgroundPattern
                    boardParameters={boardParameters}
                    backgroundRect={backgroundRect}
                    patternId={backgroundPatternId}
                />
            </defs>
            <g clipPath={boardClipPath}>
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
                        selectionGradientId={selectionGradientId}
                        legalMoveGradientId={legalMoveGradientId}
                        isLegalMove={legalMoveKeys.has(coordKey(coord))}
                    />
                )
            })}
            </g>
        </svg>
    )
})
