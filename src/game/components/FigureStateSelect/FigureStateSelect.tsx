import React, {
    FC,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type FocusEvent,
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
import { StatesPanelPortal } from './StatesPanelPortal'

const FIGURES_PER_ROW = 5
const FIGURES_PANEL_SCROLL_PADDING = 0
const FIGURES_GRID_GAP = 0
const FIGURES_PANEL_SCROLL_MAX_HEIGHT = 240

export interface FigureStateSelectProps {
    figureId?: FigureId
    stateIndex?: number
    allowAny?: boolean
    showStatePicker?: boolean
    disabled?: boolean
    onChange: (figureId: FigureId | undefined, stateIndex?: number) => void
    className?: string
    title?: string
}

function isRelatedTargetInside(
    related: EventTarget | null,
    ...containers: Array<HTMLElement | null | undefined>
): boolean {
    if (!related || !(related instanceof Node)) {
        return false
    }

    return containers.some(container => container?.contains(related))
}

export const FigureStateSelect: FC<FigureStateSelectProps> = ({
    figureId,
    stateIndex = 0,
    allowAny = false,
    showStatePicker = true,
    disabled = false,
    onChange,
    className,
    title,
}) => {
    const { state } = useGameContext()
    const [rootHovered, setRootHovered] = useState(false)
    const [figuresPanelHovered, setFiguresPanelHovered] = useState(false)
    const [statesFigureId, setStatesFigureId] = useState<FigureId | null>(null)
    const [statesPanelHovered, setStatesPanelHovered] = useState(false)
    const [openUpward, setOpenUpward] = useState(false)

    const rootRef = useRef<HTMLDivElement>(null)
    const figuresPanelRef = useRef<HTMLDivElement>(null)
    const figuresScrollRef = useRef<HTMLDivElement>(null)
    const statesPanelRef = useRef<HTMLDivElement>(null)
    const statesTileRef = useRef<HTMLDivElement | null>(null)

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

    const isFiguresOpen = rootHovered || figuresPanelHovered

    const closeStatesPanel = useCallback(() => {
        setStatesFigureId(null)
        setStatesPanelHovered(false)
        statesTileRef.current = null
    }, [])

    const closeFiguresPanel = useCallback(() => {
        setRootHovered(false)
        setFiguresPanelHovered(false)
        closeStatesPanel()
    }, [closeStatesPanel])

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
        if (!isFiguresOpen) {
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
    }, [isFiguresOpen, updatePanelPlacement, figureCatalog.length, previewSize, allowAny])

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

    const statesEntry = useMemo(
        () => (statesFigureId
            ? figureCatalog.find(entry => entry.id === statesFigureId)
            : undefined),
        [figureCatalog, statesFigureId],
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
        && statesEntry != null
        && statesEntry.states.length > 1

    useEffect(() => {
        if (!statesFigureId) {
            return
        }

        statesPanelRef.current?.focus({ preventScroll: true })
    }, [statesFigureId])

    const handleRootMouseEnter = useCallback(() => {
        if (disabled) {
            return
        }

        setRootHovered(true)
    }, [disabled])

    const handleRootMouseLeave = useCallback((event: MouseEvent<HTMLDivElement>) => {
        if (isRelatedTargetInside(
            event.relatedTarget,
            rootRef.current,
            figuresPanelRef.current,
            statesPanelRef.current,
        )) {
            return
        }

        closeFiguresPanel()
    }, [closeFiguresPanel])

    const handleFiguresPanelMouseEnter = useCallback(() => {
        setFiguresPanelHovered(true)
    }, [])

    const handleFiguresPanelMouseLeave = useCallback((event: MouseEvent<HTMLDivElement>) => {
        if (isRelatedTargetInside(
            event.relatedTarget,
            rootRef.current,
            figuresPanelRef.current,
            statesPanelRef.current,
            statesTileRef.current,
        )) {
            return
        }

        closeFiguresPanel()
    }, [closeFiguresPanel])

    const handleFiguresPanelBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
        if (isRelatedTargetInside(
            event.relatedTarget,
            rootRef.current,
            figuresPanelRef.current,
            statesPanelRef.current,
            statesTileRef.current,
        )) {
            return
        }

        closeFiguresPanel()
    }, [closeFiguresPanel])

    const handleStatesPanelBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
        if (isRelatedTargetInside(
            event.relatedTarget,
            figuresPanelRef.current,
            statesPanelRef.current,
            statesTileRef.current,
        )) {
            return
        }

        closeStatesPanel()
    }, [closeStatesPanel])

    const handleSelectAny = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        onChange(FIGURE_FILTER_ANY, undefined)
        closeFiguresPanel()
    }, [closeFiguresPanel, onChange])

    const handleSelectNone = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        onChange(FIGURE_FILTER_NONE, undefined)
        closeFiguresPanel()
    }, [closeFiguresPanel, onChange])

    const handleFigureMouseEnter = useCallback((
        event: MouseEvent<HTMLDivElement>,
        id: FigureId,
        stateCount: number,
    ) => {
        if (!showStatePicker || stateCount <= 1) {
            return
        }

        statesTileRef.current = event.currentTarget
        setStatesFigureId(id)
    }, [showStatePicker])

    const handleFigureMouseLeave = useCallback((event: MouseEvent<HTMLDivElement>) => {
        if (isRelatedTargetInside(
            event.relatedTarget,
            statesPanelRef.current,
            statesTileRef.current,
        )) {
            return
        }

        if (statesPanelHovered) {
            return
        }

        closeStatesPanel()
    }, [closeStatesPanel, statesPanelHovered])

    const handleStatesPanelMouseEnter = useCallback(() => {
        setStatesPanelHovered(true)
    }, [])

    const handleStatesPanelMouseLeave = useCallback((event: MouseEvent<HTMLDivElement>) => {
        setStatesPanelHovered(false)

        if (isRelatedTargetInside(
            event.relatedTarget,
            statesTileRef.current,
            figuresPanelRef.current,
        )) {
            return
        }

        closeStatesPanel()
    }, [closeStatesPanel])

    const handleFigureClick = useCallback((
        event: MouseEvent<HTMLDivElement>,
        id: FigureId,
        stateCount: number,
    ) => {
        event.preventDefault()
        event.stopPropagation()

        if (showStatePicker && stateCount > 1) {
            onChange(id, 0)
            closeFiguresPanel()
            return
        }

        onChange(id, 0)
        closeFiguresPanel()
    }, [closeFiguresPanel, onChange, showStatePicker])

    const handleStateSelect = useCallback((
        event: MouseEvent,
        id: FigureId,
        index: number,
    ) => {
        event.preventDefault()
        event.stopPropagation()
        onChange(id, index)
        closeFiguresPanel()
    }, [closeFiguresPanel, onChange])

    const triggerTitle = title
        ?? (filterMode === 'figure' && resolvedFigureId
            ? `${resolvedFigureId}${showStatePicker ? ` #${resolvedStateIndex}` : ''}`
            : (filterMode === 'any' ? 'любая' : 'никакая'))

    return (
        <div
            ref={rootRef}
            className={cn(styles.root, disabled && styles.rootDisabled, className)}
            onMouseEnter={handleRootMouseEnter}
            onMouseLeave={handleRootMouseLeave}
        >
            <button
                type="button"
                className={cn(
                    styles.previewTile,
                    styles.trigger,
                    !isFiguresOpen && styles.previewTileActive,
                    disabled && styles.previewTileDisabled,
                )}
                style={{ width: previewSize, height: previewSize }}
                title={triggerTitle}
                disabled={disabled}
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

            {isFiguresOpen && !disabled && (
                <div
                    ref={figuresPanelRef}
                    className={cn(styles.figuresPanel, openUpward && styles.figuresPanelUp)}
                    style={{ width: figuresPanelWidth }}
                    tabIndex={-1}
                    onMouseEnter={handleFiguresPanelMouseEnter}
                    onMouseLeave={handleFiguresPanelMouseLeave}
                    onBlur={handleFiguresPanelBlur}
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
                                    onClick={handleSelectAny}
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
                                    onClick={handleSelectNone}
                                >
                                    <span className={styles.filterPlaceholder}>?</span>
                                </div>
                            </>
                        )}

                        {figureCatalog.map(entry => {
                            const stateCount = entry.states.length
                            const isStatesOpen = statesFigureId === entry.id
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
                                        isStatesOpen && showStatePicker && stateCount > 1 && styles.figureTileStatesOpen,
                                    )}
                                    style={{ width: previewSize, height: previewSize }}
                                    title={showStatePicker && stateCount > 1
                                        ? `${entry.id} — наведите для выбора стейта`
                                        : entry.id}
                                    onMouseEnter={(event) => handleFigureMouseEnter(event, entry.id, stateCount)}
                                    onMouseLeave={handleFigureMouseLeave}
                                    onClick={(event) => handleFigureClick(event, entry.id, stateCount)}
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

                    <StatesPanelPortal
                        tileRef={statesTileRef}
                        isOpen={showStatesOverlay}
                        previewSize={previewSize}
                        stateCount={statesEntry?.states.length ?? 0}
                        panelRef={statesPanelRef}
                        layoutDeps={[statesFigureId, previewSize, figureCatalog.length]}
                        onMouseEnter={handleStatesPanelMouseEnter}
                        onMouseLeave={handleStatesPanelMouseLeave}
                        onBlur={handleStatesPanelBlur}
                    >
                        {statesEntry?.states.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                className={cn(
                                    styles.previewTile,
                                    styles.stateOption,
                                    resolvedFigureId === statesEntry.id
                                    && resolvedStateIndex === index
                                    && styles.previewTileActive,
                                )}
                                style={{ width: previewSize, height: previewSize }}
                                title={`${statesEntry.id} #${index}`}
                                onClick={(event) => handleStateSelect(
                                    event,
                                    statesEntry.id,
                                    index,
                                )}
                            >
                                <FigureSVG
                                    figureId={statesEntry.id}
                                    stateIndex={index}
                                    width={previewSize}
                                    height={previewSize}
                                />
                            </button>
                        ))}
                    </StatesPanelPortal>
                </div>
            )}
        </div>
    )
}
