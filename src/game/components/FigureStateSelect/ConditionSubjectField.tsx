import React, {
    FC,
    useCallback,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type FocusEvent,
    type MouseEvent,
} from 'react'
import cn from 'classnames'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { useGameContext } from '../../context'
import { FigureEventFigureFilter } from '../../types/events'
import { FigureId } from '../../types/figures'
import {
    FIGURE_SUBJECT_HOPPED_OVER,
    FIGURE_SUBJECT_MOVED,
    FIGURE_SUBJECT_STEPPED_ON,
    canonicalizeConditionSubjectEntries,
    clearConcreteFiguresFromSubjectEntries,
    getFigureFilterEntryKey,
    isConditionSubjectAllMode,
    isConcreteFigureFilter,
    isFigureFilterAny,
    removeFigureFromSubjectEntries,
    toggleConditionSubjectFigureAll,
    toggleFigureStateInSubjectEntries,
    toggleSubjectRoleInEntries,
} from '../../figureFilter'
import { FigureSVG } from '../FigureSVG'
import selectStyles from './FigureStateSelect.module.css'
import styles from './FigureFilterArrayField.module.css'
import { HoppedOverSubjectIcon, MovedSubjectIcon, SteppedOnSubjectIcon } from './SubjectRoleIcons'
import { FiguresPanelPortal } from './FiguresPanelPortal'

const FIGURES_PER_ROW = 5
const FIGURES_PANEL_SCROLL_PADDING = 0
const FIGURES_GRID_GAP = 0

export interface ConditionSubjectFieldProps {
    className?: string
    itemClassName?: string
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

function resolveEntryStateIndex(
    entry: FigureEventFigureFilter,
    stateCount: number,
): number {
    const maxIndex = Math.max(0, stateCount - 1)
    const index = Number.isFinite(entry.stateIndex) ? Math.trunc(entry.stateIndex!) : 0

    return Math.min(Math.max(0, index), maxIndex)
}

export const ConditionSubjectField: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    props,
}) => {
    const {
        className,
        itemClassName,
        title,
    } = props as ConditionSubjectFieldProps

    const { state } = useGameContext()
    const {
        boardParameters: { cellXDistance, cellYDistance },
        figureCatalog,
    } = state

    const entries = useMemo(
        () => canonicalizeConditionSubjectEntries(value as FigureEventFigureFilter[] | undefined),
        [value],
    )

    const isAllMode = useMemo(() => isConditionSubjectAllMode(entries), [entries])

    const hasConcreteFigures = useMemo(
        () => entries.some(entry => isConcreteFigureFilter(entry.figureId)),
        [entries],
    )

    const selectedFigureIds = useMemo(() => {
        if (isAllMode) {
            return new Set<FigureId>()
        }

        return new Set(
            entries
                .filter(entry => isConcreteFigureFilter(entry.figureId))
                .map(entry => entry.figureId),
        )
    }, [entries, isAllMode])

    const hasMovedRole = entries.some(entry => entry.figureId === FIGURE_SUBJECT_MOVED)
    const hasSteppedOnRole = entries.some(entry => entry.figureId === FIGURE_SUBJECT_STEPPED_ON)
    const hasHoppedOverRole = entries.some(entry => entry.figureId === FIGURE_SUBJECT_HOPPED_OVER)

    const [rootHovered, setRootHovered] = useState(false)
    const [figuresPanelHovered, setFiguresPanelHovered] = useState(false)
    const [statesFigureId, setStatesFigureId] = useState<FigureId | null>(null)
    const [statesPanelHovered, setStatesPanelHovered] = useState(false)
    const [statesOverlayStyle, setStatesOverlayStyle] = useState<CSSProperties | null>(null)

    const rootRef = useRef<HTMLDivElement>(null)
    const figuresPanelRef = useRef<HTMLDivElement>(null)
    const figuresScrollRef = useRef<HTMLDivElement>(null)
    const statesPanelRef = useRef<HTMLDivElement>(null)
    const statesTileRef = useRef<HTMLDivElement | null>(null)

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

    const statesEntry = useMemo(
        () => (statesFigureId
            ? figureCatalog.find(entry => entry.id === statesFigureId)
            : undefined),
        [figureCatalog, statesFigureId],
    )

    const showStatesOverlay = statesEntry != null && statesEntry.states.length > 1

    const selectedStateIndicesForHover = useMemo(() => {
        if (!statesFigureId || !statesEntry) {
            return new Set<number>()
        }

        return new Set(
            entries
                .filter(entry => entry.figureId === statesFigureId)
                .map(entry => resolveEntryStateIndex(entry, statesEntry.states.length)),
        )
    }, [entries, statesEntry, statesFigureId])

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

    const commitEntries = useCallback((next: FigureEventFigureFilter[]) => {
        onChange(name, canonicalizeConditionSubjectEntries(next))
    }, [name, onChange])

    const handleSelectAll = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        commitEntries(toggleConditionSubjectFigureAll(entries))
        closeStatesPanel()
    }, [closeStatesPanel, commitEntries, entries])

    const handleClearFigures = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        commitEntries(clearConcreteFiguresFromSubjectEntries(entries))
        closeStatesPanel()
    }, [closeStatesPanel, commitEntries, entries])

    const handleToggleRole = useCallback((
        event: MouseEvent,
        role: typeof FIGURE_SUBJECT_MOVED | typeof FIGURE_SUBJECT_STEPPED_ON | typeof FIGURE_SUBJECT_HOPPED_OVER,
    ) => {
        event.preventDefault()
        event.stopPropagation()
        commitEntries(toggleSubjectRoleInEntries(entries, role))
        closeStatesPanel()
    }, [closeStatesPanel, commitEntries, entries])

    const handleToggleFigureState = useCallback((
        figureId: FigureId,
        stateIndex: number,
        options?: { keepStatesOpen?: boolean },
    ) => {
        const next = toggleFigureStateInSubjectEntries(entries, figureId, stateIndex)
        commitEntries(next)

        if (!options?.keepStatesOpen) {
            closeStatesPanel()
        }
    }, [closeStatesPanel, commitEntries, entries])

    const handleRemoveFigureStates = useCallback((figureId: FigureId) => {
        commitEntries(removeFigureFromSubjectEntries(entries, figureId))
    }, [commitEntries, entries])

    const updateStatesOverlayPosition = useCallback(() => {
        const panel = figuresPanelRef.current
        const tile = statesTileRef.current

        if (!panel || !tile) {
            setStatesOverlayStyle(null)
            return
        }

        const panelRect = panel.getBoundingClientRect()
        const tileRect = tile.getBoundingClientRect()

        setStatesOverlayStyle({
            top: tileRect.top - panelRect.top,
            left: tileRect.right - panelRect.left,
            width: previewSize,
            minHeight: tileRect.height,
        })
    }, [previewSize])

    React.useEffect(() => {
        if (!showStatesOverlay) {
            setStatesOverlayStyle(null)
            return
        }

        updateStatesOverlayPosition()
    }, [showStatesOverlay, statesFigureId, previewSize, figureCatalog.length, updateStatesOverlayPosition])

    React.useEffect(() => {
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

    React.useEffect(() => {
        if (!statesFigureId) {
            return
        }

        statesPanelRef.current?.focus({ preventScroll: true })
    }, [statesFigureId])

    const handleRootMouseEnter = useCallback(() => {
        setRootHovered(true)
    }, [])

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

    const handleUnselectedFigureClick = useCallback((
        event: MouseEvent<HTMLDivElement>,
        id: FigureId,
        stateCount: number,
    ) => {
        event.preventDefault()
        event.stopPropagation()
        handleToggleFigureState(id, 0, { keepStatesOpen: true })
    }, [handleToggleFigureState])

    const handleFigureMouseEnter = useCallback((
        event: MouseEvent<HTMLDivElement>,
        id: FigureId,
        stateCount: number,
    ) => {
        if (stateCount <= 1) {
            return
        }

        statesTileRef.current = event.currentTarget
        setStatesFigureId(id)
    }, [])

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

    const handleStateSelect = useCallback((
        event: MouseEvent,
        id: FigureId,
        index: number,
    ) => {
        event.preventDefault()
        event.stopPropagation()
        handleToggleFigureState(id, index, { keepStatesOpen: true })
    }, [handleToggleFigureState])

    const handleSelectedFigureClick = useCallback((
        event: MouseEvent<HTMLDivElement>,
        id: FigureId,
    ) => {
        event.preventDefault()
        event.stopPropagation()
        handleRemoveFigureStates(id)
        closeStatesPanel()
    }, [closeStatesPanel, handleRemoveFigureStates])

    const triggerTitle = title

    const renderTriggerTile = (entry: FigureEventFigureFilter, index: number) => {
        if (entry.figureId === FIGURE_SUBJECT_MOVED) {
            return (
                <div
                    key={`moved-${index}`}
                    className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                    style={{ width: previewSize, height: previewSize }}
                    title="наступающая"
                >
                    <MovedSubjectIcon size={previewSize * 0.75} />
                </div>
            )
        }

        if (entry.figureId === FIGURE_SUBJECT_STEPPED_ON) {
            return (
                <div
                    key={`stepped-${index}`}
                    className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                    style={{ width: previewSize, height: previewSize }}
                    title="наступаемая"
                >
                    <SteppedOnSubjectIcon size={previewSize * 0.75} />
                </div>
            )
        }

        if (entry.figureId === FIGURE_SUBJECT_HOPPED_OVER) {
            return (
                <div
                    key={`hopped-${index}`}
                    className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                    style={{ width: previewSize, height: previewSize }}
                    title="перепрыгнутая"
                >
                    <HoppedOverSubjectIcon size={previewSize * 0.75} />
                </div>
            )
        }

        if (isFigureFilterAny(entry.figureId)) {
            return (
                <div
                    key={`all-${index}`}
                    className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                    style={{ width: previewSize, height: previewSize }}
                    title="любая — снять"
                    onClick={handleSelectAll}
                >
                    <span className={selectStyles.filterPlaceholder}>all</span>
                </div>
            )
        }

        const catalogEntry = figureCatalog.find(item => item.id === entry.figureId)

        if (!catalogEntry) {
            return null
        }

        const stateIndex = resolveEntryStateIndex(entry, catalogEntry.states.length)

        return (
            <div
                key={`${getFigureFilterEntryKey(entry)}-${index}`}
                className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                style={{ width: previewSize, height: previewSize }}
                title={`${catalogEntry.id}${catalogEntry.states.length > 1 ? ` #${stateIndex}` : ''}`}
            >
                <FigureSVG
                    figureId={catalogEntry.id}
                    stateIndex={stateIndex}
                    width={previewSize}
                    height={previewSize}
                />
            </div>
        )
    }

    return (
        <div
            ref={rootRef}
            className={cn(styles.root, className)}
            onMouseEnter={handleRootMouseEnter}
            onMouseLeave={handleRootMouseLeave}
        >
            <div
                className={cn(
                    styles.trigger,
                    !isFiguresOpen && styles.triggerActive,
                )}
                title={triggerTitle}
            >
                {entries.map((entry, index) => renderTriggerTile(entry, index))}
            </div>

            {isFiguresOpen && (
                <FiguresPanelPortal
                    anchorRef={rootRef}
                    panelRef={figuresPanelRef}
                    isOpen={isFiguresOpen}
                    width={figuresPanelWidth}
                    layoutDeps={[figureCatalog.length, previewSize, statesFigureId]}
                    onMouseEnter={handleFiguresPanelMouseEnter}
                    onMouseLeave={handleFiguresPanelMouseLeave}
                    onBlur={handleFiguresPanelBlur}
                >
                    <div
                        ref={figuresScrollRef}
                        className={selectStyles.figuresPanelScroll}
                        style={{ gridTemplateColumns: `repeat(${FIGURES_PER_ROW}, ${previewSize}px)` }}
                    >
                        <div
                            className={cn(
                                selectStyles.previewTile,
                                selectStyles.figureTile,
                                hasMovedRole && styles.figureTileSelected,
                            )}
                            style={{ width: previewSize, height: previewSize }}
                            title="наступающая"
                            onClick={(event) => handleToggleRole(event, FIGURE_SUBJECT_MOVED)}
                        >
                            <MovedSubjectIcon size={previewSize * 0.75} />
                        </div>

                        <div
                            className={cn(
                                selectStyles.previewTile,
                                selectStyles.figureTile,
                                hasSteppedOnRole && styles.figureTileSelected,
                            )}
                            style={{ width: previewSize, height: previewSize }}
                            title="наступаемая"
                            onClick={(event) => handleToggleRole(event, FIGURE_SUBJECT_STEPPED_ON)}
                        >
                            <SteppedOnSubjectIcon size={previewSize * 0.75} />
                        </div>

                        <div
                            className={cn(
                                selectStyles.previewTile,
                                selectStyles.figureTile,
                                hasHoppedOverRole && styles.figureTileSelected,
                            )}
                            style={{ width: previewSize, height: previewSize }}
                            title="перепрыгнутая"
                            onClick={(event) => handleToggleRole(event, FIGURE_SUBJECT_HOPPED_OVER)}
                        >
                            <HoppedOverSubjectIcon size={previewSize * 0.75} />
                        </div>

                        <div
                            className={cn(
                                selectStyles.previewTile,
                                selectStyles.figureTile,
                                isAllMode && selectStyles.previewTileActive,
                            )}
                            style={{ width: previewSize, height: previewSize }}
                            title="любая"
                            onClick={handleSelectAll}
                        >
                            <span className={selectStyles.filterPlaceholder}>all</span>
                        </div>

                        <div
                            className={cn(
                                selectStyles.previewTile,
                                selectStyles.figureTile,
                                !isAllMode && !hasConcreteFigures && selectStyles.previewTileActive,
                            )}
                            style={{ width: previewSize, height: previewSize }}
                            title="не задано"
                            onClick={handleClearFigures}
                        >
                            <span className={selectStyles.filterPlaceholder}>?</span>
                        </div>

                        {figureCatalog.map(entry => {
                            const stateCount = entry.states.length
                            const figureEntries = isAllMode
                                ? []
                                : entries.filter(item => item.figureId === entry.id)
                            const isSelected = selectedFigureIds.has(entry.id)
                            const isStatesOpen = statesFigureId === entry.id
                            const previewEntry = figureEntries[0]
                            const tileStateIndex = previewEntry
                                ? resolveEntryStateIndex(previewEntry, stateCount)
                                : 0

                            return (
                                <div
                                    key={entry.id}
                                    className={cn(
                                        selectStyles.previewTile,
                                        selectStyles.figureTile,
                                        isSelected && styles.figureTileSelected,
                                        isStatesOpen && stateCount > 1 && selectStyles.figureTileStatesOpen,
                                    )}
                                    style={{ width: previewSize, height: previewSize }}
                                    title={isSelected ? `${entry.id} — убрать все состояния` : entry.id}
                                    onMouseEnter={(event) => handleFigureMouseEnter(
                                        event,
                                        entry.id,
                                        stateCount,
                                    )}
                                    onMouseLeave={handleFigureMouseLeave}
                                    onClick={(event) => {
                                        if (isSelected) {
                                            handleSelectedFigureClick(event, entry.id)
                                            return
                                        }

                                        handleUnselectedFigureClick(event, entry.id, stateCount)
                                    }}
                                >
                                    <FigureSVG
                                        figureId={entry.id}
                                        stateIndex={tileStateIndex}
                                        width={previewSize}
                                        height={previewSize}
                                        highlightSelection={isSelected}
                                    />
                                </div>
                            )
                        })}
                    </div>

                    {showStatesOverlay && statesEntry && statesOverlayStyle && (
                        <div
                            ref={statesPanelRef}
                            className={styles.statesPanelRight}
                            style={statesOverlayStyle}
                            tabIndex={-1}
                            onMouseEnter={handleStatesPanelMouseEnter}
                            onMouseLeave={handleStatesPanelMouseLeave}
                            onBlur={handleStatesPanelBlur}
                        >
                            {statesEntry.states.map((_, index) => {
                                const isStateSelected = selectedStateIndicesForHover.has(index)

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        className={cn(
                                            selectStyles.previewTile,
                                            selectStyles.stateOption,
                                            isStateSelected && styles.stateOptionSelected,
                                        )}
                                        style={{ width: previewSize, height: previewSize }}
                                        title={`${statesEntry.id} #${index}${isStateSelected ? ' — убрать' : ''}`}
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
                                            highlightSelection={isStateSelected}
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </FiguresPanelPortal>
            )}
        </div>
    )
}
