import React, {
    FC,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FocusEvent,
    type MouseEvent,
} from 'react'
import cn from 'classnames'
import { ParameterInputComponentProps } from '../../../components/Form1'
import { useGameContext } from '../../context'
import { FigureEventFigureFilter } from '../../types/events'
import { FigureId } from '../../types/figures'
import {
    canonicalizeFigureFilterArray,
    clearFigureFilterArray,
    getFigureFilterEntryKey,
    isConcreteFigureFilter,
    isFigureFilterAny,
    isFigureFilterNone,
    removeFigureFromFilterArray,
    toggleFigureFilterArrayAll,
    toggleFigureStateInFilterArray,
} from '../../figureFilter'
import { FigureSVG } from '../FigureSVG'
import { resolveFigureFilterPreviewSize } from '../../figureCellFit'
import { logFigureFilterDebug } from './figureFilterArrayDebug'
import selectStyles from './FigureStateSelect.module.css'
import styles from './FigureFilterArrayField.module.css'
import { FiguresPanelPortal } from './FiguresPanelPortal'
import { StatesPanelPortal } from './StatesPanelPortal'

const FIGURES_PER_ROW = 5
const FIGURES_PANEL_SCROLL_PADDING = 0
const FIGURES_GRID_GAP = 0

export interface FigureFilterArrayFieldProps {
    allowAny?: boolean
    showStatePicker?: boolean
    className?: string
    itemClassName?: string
    title?: string
    matchMode?: 'any' | 'all'
    onMatchModeChange?: (mode: 'any' | 'all') => void
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

export const FigureFilterArrayField: FC<ParameterInputComponentProps> = ({
    name,
    value,
    onChange,
    props,
}) => {
    const {
        allowAny = true,
        showStatePicker = true,
        className,
        itemClassName,
        title,
        matchMode,
        onMatchModeChange,
    } = props as FigureFilterArrayFieldProps

    const { state } = useGameContext()
    const {
        boardParameters: { cellXDistance, cellYDistance },
        figureCatalog,
    } = state

    const entries = useMemo(
        () => canonicalizeFigureFilterArray(value as FigureEventFigureFilter[] | undefined),
        [value],
    )

    useEffect(() => {
        logFigureFilterDebug('value-prop', {
            field: name,
            after: value,
            detail: {
                entries,
                isAllMode: entries.length === 1 && isFigureFilterAny(entries[0].figureId),
            },
        })
    }, [name, value, entries])

    const isAllMode = useMemo(
        () => entries.length === 1 && isFigureFilterAny(entries[0].figureId),
        [entries],
    )

    const isEmptyMode = entries.length === 0
    const isNoneMode = entries.length === 1 && isFigureFilterNone(entries[0].figureId)

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

    const [rootHovered, setRootHovered] = useState(false)
    const [figuresPanelHovered, setFiguresPanelHovered] = useState(false)
    const [statesFigureId, setStatesFigureId] = useState<FigureId | null>(null)
    const [statesPanelHovered, setStatesPanelHovered] = useState(false)

    const rootRef = useRef<HTMLDivElement>(null)
    const figuresPanelRef = useRef<HTMLDivElement>(null)
    const figuresScrollRef = useRef<HTMLDivElement>(null)
    const statesPanelRef = useRef<HTMLDivElement>(null)
    const statesTileRef = useRef<HTMLDivElement | null>(null)

    const previewSize = useMemo(
        () => resolveFigureFilterPreviewSize(cellXDistance, cellYDistance),
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

    const showStatesOverlay = showStatePicker
        && statesEntry != null
        && statesEntry.states.length > 1

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

    const commitEntries = useCallback((next: FigureEventFigureFilter[], action: string, detail?: Record<string, unknown>) => {
        logFigureFilterDebug(action, {
            field: name,
            before: entries,
            after: next,
            detail,
        })
        onChange(name, next)
    }, [entries, name, onChange])

    const handleSelectAll = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        commitEntries(toggleFigureFilterArrayAll(entries), 'toggle-all')
        closeStatesPanel()
    }, [closeStatesPanel, commitEntries, entries])

    const handleClearFigures = useCallback((event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        commitEntries(clearFigureFilterArray(), 'clear-figures')
        closeStatesPanel()
    }, [closeStatesPanel, commitEntries])

    const handleToggleFigureState = useCallback((
        figureId: FigureId,
        stateIndex: number,
        options?: { keepStatesOpen?: boolean },
    ) => {
        const next = toggleFigureStateInFilterArray(entries, figureId, stateIndex)
        commitEntries(next, 'toggle-state', { figureId, stateIndex })

        if (!options?.keepStatesOpen) {
            closeStatesPanel()
        }
    }, [closeStatesPanel, commitEntries, entries])

    const handleRemoveFigureStates = useCallback((figureId: FigureId) => {
        const next = removeFigureFromFilterArray(entries, figureId)
        commitEntries(next, 'remove-figure', { figureId })
    }, [commitEntries, entries])

    useEffect(() => {
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
        logFigureFilterDebug('figure-click', {
            field: name,
            figureId: id,
            detail: { stateCount, showStatePicker },
        })

        event.preventDefault()
        event.stopPropagation()
        handleToggleFigureState(id, 0, { keepStatesOpen: true })
    }, [handleToggleFigureState, name])

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

    const handleStateSelect = useCallback((
        event: MouseEvent,
        id: FigureId,
        index: number,
    ) => {
        logFigureFilterDebug('state-select', {
            field: name,
            figureId: id,
            detail: { stateIndex: index },
        })
        event.preventDefault()
        event.stopPropagation()
        handleToggleFigureState(id, index, { keepStatesOpen: true })
    }, [handleToggleFigureState, name])

    const handleSelectedFigureClick = useCallback((
        event: MouseEvent<HTMLDivElement>,
        id: FigureId,
    ) => {
        logFigureFilterDebug('selected-click', {
            field: name,
            figureId: id,
        })
        event.preventDefault()
        event.stopPropagation()
        handleRemoveFigureStates(id)
        closeStatesPanel()
    }, [closeStatesPanel, handleRemoveFigureStates, name])

    const triggerTitle = title ?? 'фильтр фигур'

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
                {isAllMode ? (
                    <div
                        className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                        style={{ width: previewSize, height: previewSize }}
                        title="любая — снять"
                        onClick={handleSelectAll}
                    >
                        <span className={selectStyles.filterPlaceholder}>all</span>
                    </div>
                ) : isEmptyMode || isNoneMode ? (
                    <div
                        className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                        style={{ width: previewSize, height: previewSize }}
                        title="не задано"
                    >
                        <span className={selectStyles.filterPlaceholder}>?</span>
                    </div>
                ) : (
                    <>
                        {entries.map((entry, index) => {
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
                        })}
                        {onMatchModeChange && entries.length > 1 && (
                            <div
                                className={cn(selectStyles.previewTile, styles.triggerTile, itemClassName)}
                                style={{ width: previewSize, height: previewSize }}
                                title={matchMode === 'all' ? 'все совпадают' : 'любой совпадает'}
                            >
                                <span className={selectStyles.filterPlaceholder}>
                                    {matchMode === 'all' ? '&' : 'or'}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {isFiguresOpen && (
                <FiguresPanelPortal
                    anchorRef={rootRef}
                    panelRef={figuresPanelRef}
                    isOpen={isFiguresOpen}
                    width={figuresPanelWidth}
                    layoutDeps={[figureCatalog.length, previewSize, allowAny, statesFigureId]}
                    onMouseEnter={handleFiguresPanelMouseEnter}
                    onMouseLeave={handleFiguresPanelMouseLeave}
                    onBlur={handleFiguresPanelBlur}
                >
                    <div
                        ref={figuresScrollRef}
                        className={selectStyles.figuresPanelScroll}
                        style={{ gridTemplateColumns: `repeat(${FIGURES_PER_ROW}, ${previewSize}px)` }}
                    >
                        {allowAny && (
                            <>
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
                                        (isEmptyMode || isNoneMode) && selectStyles.previewTileActive,
                                    )}
                                    style={{ width: previewSize, height: previewSize }}
                                    title="не задано"
                                    onClick={handleClearFigures}
                                >
                                    <span className={selectStyles.filterPlaceholder}>?</span>
                                </div>
                            </>
                        )}

                        {onMatchModeChange && entries.length > 1 && (
                            <div
                                className={cn(
                                    selectStyles.previewTile,
                                    selectStyles.figureTile,
                                    matchMode === 'all' && selectStyles.previewTileActive,
                                )}
                                style={{ width: previewSize, height: previewSize }}
                                title={matchMode === 'all' ? 'все совпадают (нажми для ИЛИ)' : 'любой совпадает (нажми для И)'}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    onMatchModeChange(matchMode === 'all' ? 'any' : 'all')
                                }}
                            >
                                <span className={selectStyles.filterPlaceholder}>
                                    {matchMode === 'all' ? '&' : 'or'}
                                </span>
                            </div>
                        )}

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
                                        isStatesOpen && showStatePicker && stateCount > 1 && selectStyles.figureTileStatesOpen,
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
                        {statesEntry?.states.map((_, index) => {
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
                    </StatesPanelPortal>
                </FiguresPanelPortal>
            )}
        </div>
    )
}
