import React, {
    FC,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent,
} from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import {
    FIGURE_FILTER_ANY,
    FIGURE_FILTER_NONE,
    isConcreteFigureFilter,
    resolveFigureFilterDisplayMode,
} from '../../figureFilter'
import { FigureId } from '../../types/figures'
import { FigureSVG } from '../FigureSVG'
import styles from './FigureStateSelect.module.css'

const FIGURES_PER_ROW = 5
const FIGURES_PANEL_SCROLL_PADDING = 0
const FIGURES_GRID_GAP = 0
const FIGURES_PANEL_SCROLL_MAX_HEIGHT = 240

export interface FigureStateSelectProps {
    figureId?: FigureId
    stateIndex?: number
    allowAny?: boolean
    showStatePicker?: boolean
    onChange: (figureId: FigureId | undefined, stateIndex?: number) => void
    className?: string
    title?: string
}

export const FigureStateSelect: FC<FigureStateSelectProps> = ({
    figureId,
    stateIndex = 0,
    allowAny = false,
    showStatePicker = true,
    onChange,
    className,
    title,
}) => {
    const { state } = useGameContext()
    const [rootHovered, setRootHovered] = useState(false)
    const [panelHovered, setPanelHovered] = useState(false)
    const [hoveredFigureId, setHoveredFigureId] = useState<FigureId | null>(null)
    const [statesOverlayStyle, setStatesOverlayStyle] = useState<CSSProperties | null>(null)
    const [openUpward, setOpenUpward] = useState(false)

    const rootRef = useRef<HTMLDivElement>(null)
    const figuresPanelRef = useRef<HTMLDivElement>(null)
    const figuresScrollRef = useRef<HTMLDivElement>(null)
    const statesPanelRef = useRef<HTMLDivElement>(null)
    const hoveredTileRef = useRef<HTMLDivElement | null>(null)

    const {
        boardParameters: { cellXDistance, cellYDistance },
        figureCatalog,
    } = state

    const previewSize = useMemo(
        () => Math.min(cellXDistance, cellYDistance),
        [cellXDistance, cellYDistance],
    )

    const figuresPanelWidth = useMemo(
        () => (
            FIGURES_PER_ROW * previewSize
            + (FIGURES_PER_ROW - 1) * FIGURES_GRID_GAP
            + FIGURES_PANEL_SCROLL_PADDING
        ),
        [previewSize],
    )

    const isOpen = rootHovered || panelHovered

    const estimatePanelHeight = useCallback(() => {
        const itemCount = figureCatalog.length + (allowAny ? 2 : 0)
        const rows = Math.max(1, Math.ceil(itemCount / FIGURES_PER_ROW))
        const gridHeight = rows * previewSize + Math.max(0, rows - 1) * FIGURES_GRID_GAP

        return Math.min(gridHeight, FIGURES_PANEL_SCROLL_MAX_HEIGHT) + FIGURES_PANEL_SCROLL_PADDING
    }, [allowAny, figureCatalog.length, previewSize])

    const updatePanelPlacement = useCallback(() => {
        const root = rootRef.current

        if (!root) {
            return
        }

        const rect = root.getBoundingClientRect()
        const panelHeight = figuresPanelRef.current?.offsetHeight ?? estimatePanelHeight()
        const spaceBelow = window.innerHeight - rect.top
        const spaceAbove = rect.bottom

        setOpenUpward(spaceBelow < panelHeight && spaceAbove >= spaceBelow)
    }, [estimatePanelHeight])

    useLayoutEffect(() => {
        if (!isOpen) {
            setOpenUpward(false)
            return
        }

        updatePanelPlacement()

        window.addEventListener('resize', updatePanelPlacement)
        window.addEventListener('scroll', updatePanelPlacement, true)

        return () => {
            window.removeEventListener('resize', updatePanelPlacement)
            window.removeEventListener('scroll', updatePanelPlacement, true)
        }
    }, [isOpen, updatePanelPlacement, figureCatalog.length, previewSize, allowAny])

    const selectedEntry = useMemo(
        () => (isConcreteFigureFilter(figureId)
            ? figureCatalog.find(entry => entry.id === figureId)
            : undefined),
        [figureCatalog, figureId],
    )

    const resolvedFigureId = selectedEntry ? figureId : undefined

    const filterMode = useMemo(
        () => resolveFigureFilterDisplayMode(figureId, allowAny, selectedEntry != null),
        [figureId, allowAny, selectedEntry],
    )

    const hoveredEntry = useMemo(
        () => (hoveredFigureId
            ? figureCatalog.find(entry => entry.id === hoveredFigureId)
            : undefined),
        [figureCatalog, hoveredFigureId],
    )

    const resolvedStateIndex = useMemo(() => {
        if (!selectedEntry) {
            return 0
        }

        const maxIndex = selectedEntry.states.length - 1
        const index = Number.isFinite(stateIndex) ? Math.trunc(stateIndex!) : 0

        return Math.min(Math.max(0, index), maxIndex)
    }, [selectedEntry, stateIndex])

    const showStatesOverlay = showStatePicker
        && hoveredEntry != null
        && hoveredEntry.states.length > 1

    const updateStatesOverlayPosition = useCallback(() => {
        const panel = figuresPanelRef.current
        const tile = hoveredTileRef.current

        if (!panel || !tile) {
            setStatesOverlayStyle(null)
            return
        }

        const panelRect = panel.getBoundingClientRect()
        const tileRect = tile.getBoundingClientRect()

        setStatesOverlayStyle({
            top: tileRect.top - panelRect.top,
            left: tileRect.left - panelRect.left,
            width: tileRect.width,
            minHeight: tileRect.height,
        })
    }, [])

    useEffect(() => {
        if (!showStatesOverlay) {
            setStatesOverlayStyle(null)
            return
        }

        updateStatesOverlayPosition()
    }, [showStatesOverlay, hoveredFigureId, previewSize, figureCatalog.length, updateStatesOverlayPosition])

    useEffect(() => {
        if (!showStatesOverlay) {
            return
        }

        const scrollEl = figuresScrollRef.current
        if (!scrollEl) {
            return
        }

        const handleScroll = () => {
            updateStatesOverlayPosition()
        }

        scrollEl.addEventListener('scroll', handleScroll, { passive: true })
        window.addEventListener('resize', handleScroll)

        return () => {
            scrollEl.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleScroll)
        }
    }, [showStatesOverlay, updateStatesOverlayPosition])

    const handleRootEnter = useCallback(() => {
        setRootHovered(true)
    }, [])

    const handleRootLeave = useCallback(() => {
        setRootHovered(false)
        setHoveredFigureId(null)
        hoveredTileRef.current = null
    }, [])

    const handlePanelEnter = useCallback(() => {
        setPanelHovered(true)
    }, [])

    const handlePanelLeave = useCallback(() => {
        setPanelHovered(false)
        setHoveredFigureId(null)
        hoveredTileRef.current = null
    }, [])

    const handleTileEnter = useCallback((id: FigureId, tile: HTMLDivElement) => {
        hoveredTileRef.current = tile
        setHoveredFigureId(id)
    }, [])

    const handleTileLeave = useCallback((id: FigureId, event: React.MouseEvent) => {
        const related = event.relatedTarget as Node | null

        if (related && statesPanelRef.current?.contains(related)) {
            return
        }

        if (hoveredFigureId === id) {
            setHoveredFigureId(null)
            hoveredTileRef.current = null
        }
    }, [hoveredFigureId])

    const handleSelectAny = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        onChange(FIGURE_FILTER_ANY, undefined)
        setRootHovered(true)
        setPanelHovered(true)
    }, [onChange])

    const handleSelectNone = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        onChange(FIGURE_FILTER_NONE, undefined)
        setRootHovered(true)
        setPanelHovered(true)
    }, [onChange])

    const handleSelectFigure = useCallback((event: MouseEvent, id: FigureId, stateCount: number) => {
        event.preventDefault()
        event.stopPropagation()

        if (showStatePicker && stateCount > 1) {
            return
        }

        onChange(id, 0)
        setRootHovered(true)
        setPanelHovered(true)
    }, [onChange, showStatePicker])

    const handleSelectState = useCallback((
        event: MouseEvent,
        id: FigureId,
        index: number,
    ) => {
        event.preventDefault()
        event.stopPropagation()
        onChange(id, index)
        setRootHovered(true)
        setPanelHovered(true)
    }, [onChange])

    const triggerTitle = title
        ?? (filterMode === 'figure' && resolvedFigureId
            ? `${resolvedFigureId}${showStatePicker && (selectedEntry?.states.length ?? 0) > 1 ? ` #${resolvedStateIndex}` : ''}`
            : (filterMode === 'any' ? 'любая' : 'никакая'))

    return (
        <div
            ref={rootRef}
            className={cn(styles.root, className)}
            onMouseEnter={handleRootEnter}
            onMouseLeave={handleRootLeave}
        >
            <button
                type="button"
                className={cn(styles.previewTile, styles.trigger, !isOpen && styles.previewTileActive)}
                style={{ width: previewSize, height: previewSize }}
                title={triggerTitle}
            >
                {filterMode === 'figure' && resolvedFigureId ? (
                    <FigureSVG
                        figureId={resolvedFigureId}
                        stateIndex={resolvedStateIndex}
                        width={previewSize}
                        height={previewSize}
                    />
                ) : (
                    <span className={styles.filterPlaceholder}>
                        {filterMode === 'any' ? 'all' : '?'}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    ref={figuresPanelRef}
                    className={cn(styles.figuresPanel, openUpward && styles.figuresPanelUp)}
                    style={{ width: figuresPanelWidth }}
                    onMouseEnter={handlePanelEnter}
                    onMouseLeave={handlePanelLeave}
                >
                    <div
                        ref={figuresScrollRef}
                        className={styles.figuresPanelScroll}
                        style={{ gridTemplateColumns: `repeat(${FIGURES_PER_ROW}, ${previewSize}px)` }}
                    >
                        {allowAny && (
                            <>
                                <div
                                    className={cn(
                                        styles.previewTile,
                                        styles.figureTile,
                                        filterMode === 'any' && styles.previewTileActive,
                                    )}
                                    style={{ width: previewSize, height: previewSize }}
                                    title="любая"
                                    onMouseDown={handleSelectAny}
                                >
                                    <span className={styles.filterPlaceholder}>all</span>
                                </div>
                                <div
                                    className={cn(
                                        styles.previewTile,
                                        styles.figureTile,
                                        filterMode === 'none' && styles.previewTileActive,
                                    )}
                                    style={{ width: previewSize, height: previewSize }}
                                    title="никакая"
                                    onMouseDown={handleSelectNone}
                                >
                                    <span className={styles.filterPlaceholder}>?</span>
                                </div>
                            </>
                        )}

                        {figureCatalog.map(entry => {
                            const stateCount = entry.states.length
                            const isHovered = hoveredFigureId === entry.id
                            const tileStateIndex = resolvedFigureId === entry.id
                                ? resolvedStateIndex
                                : 0

                            return (
                                <div
                                    key={entry.id}
                                    className={cn(
                                        styles.previewTile,
                                        styles.figureTile,
                                        resolvedFigureId === entry.id && styles.previewTileActive,
                                        isHovered && showStatePicker && stateCount > 1 && styles.figureTileStatesOpen,
                                    )}
                                    style={{ width: previewSize, height: previewSize }}
                                    title={entry.id}
                                    onMouseEnter={(event) => handleTileEnter(entry.id, event.currentTarget)}
                                    onMouseLeave={(event) => handleTileLeave(entry.id, event)}
                                    onMouseDown={(event) => handleSelectFigure(event, entry.id, stateCount)}
                                >
                                    <FigureSVG
                                        figureId={entry.id}
                                        stateIndex={tileStateIndex}
                                        width={previewSize}
                                        height={previewSize}
                                    />
                                </div>
                            )
                        })}
                    </div>

                    {showStatesOverlay && hoveredEntry && statesOverlayStyle && (
                        <div
                            ref={statesPanelRef}
                            className={styles.statesPanel}
                            style={statesOverlayStyle}
                            onMouseEnter={handlePanelEnter}
                            onMouseLeave={(event) => {
                                const related = event.relatedTarget as Node | null

                                if (related && hoveredTileRef.current?.contains(related)) {
                                    return
                                }

                                if (!related || !figuresPanelRef.current?.contains(related)) {
                                    setHoveredFigureId(null)
                                    hoveredTileRef.current = null
                                }
                            }}
                        >
                            {hoveredEntry.states.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={cn(
                                        styles.previewTile,
                                        styles.stateOption,
                                        resolvedFigureId === hoveredEntry.id
                                        && resolvedStateIndex === index
                                        && styles.previewTileActive,
                                    )}
                                    title={`${hoveredEntry.id} #${index}`}
                                    onMouseDown={(event) => handleSelectState(
                                        event,
                                        hoveredEntry.id,
                                        index,
                                    )}
                                >
                                    <FigureSVG
                                        figureId={hoveredEntry.id}
                                        stateIndex={index}
                                        width={previewSize}
                                        height={previewSize}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
