import React, { FC, useCallback, useEffect, useMemo, useRef } from 'react'
import { HiddenScroll } from 'bbuutoonnss'
import { useGameContext } from '../context'
import { FigureButton } from './FigureButton'
import { FigureId } from '../types/figures'
import { Mode } from '../types'
import { FigureParametersForm } from './FigureParametersForm/FigureParametersForm'
import { resolveStripCellPixelSize } from '../figureCellFit'
import { scrollDebugLog } from '../scrollDebugLog'
import styles from './Figures.module.css'

const SCROLL_SOURCE = 'figures'

export const Figures: FC = () => {
    const {
        setMode,
        activeFigure,
        setActiveFigure,
        isFigureArrangeEnabled,
        toggleFigureArrange,
        getFigureStateIndex,
        state,
        addFigure,
        removeFigure,
    } = useGameContext()

    const scrollRef = useRef<HTMLDivElement>(null)
    const catalogLengthRef = useRef(state.figureCatalog.length)
    const canDeleteFigure = state.figureCatalog.length > 1
    const { cellXDistance, cellYDistance } = state.boardParameters
    const stripCellSize = useMemo(
        () => resolveStripCellPixelSize(cellXDistance, cellYDistance),
        [cellXDistance, cellYDistance],
    )
    const figureCellAspect = stripCellSize.height > 0
        ? stripCellSize.width / stripCellSize.height
        : 1
    const figuresPanelStyle = {
        '--figure-cell-aspect': figureCellAspect,
        '--figure-cell-height': `${stripCellSize.height}px`,
        '--figure-cell-width': `${stripCellSize.width}px`,
    } as React.CSSProperties

    const handleFigureClick = useCallback((figureId: FigureId) => {
        if (activeFigure === figureId) {
            toggleFigureArrange(figureId)
            return
        }

        setActiveFigure(figureId)
    }, [activeFigure, setActiveFigure, toggleFigureArrange])

    useEffect(() => {
        const { figureCatalog } = state

        if (figureCatalog.length === 0) {
            if (activeFigure !== undefined) {
                setActiveFigure(undefined)
            }
            return
        }

        const isCurrentValid = activeFigure != null
            && figureCatalog.some(entry => entry.id === activeFigure)

        if (!isCurrentValid) {
            setActiveFigure(figureCatalog[0].id)
        }
    }, [state.figureCatalog, activeFigure, setActiveFigure])

    const handleAddFigure = useCallback(() => {
        addFigure()
    }, [addFigure])

    useEffect(() => {
        if (activeFigure && isFigureArrangeEnabled(activeFigure)) {
            setMode(Mode.FiguresArrange)
        } else {
            setMode(Mode.Game)
        }
    }, [activeFigure, isFigureArrangeEnabled, setMode])

    useEffect(() => () => setMode(Mode.Game), [setMode])

    const handleRemoveFigure = useCallback((figureId: FigureId) => {
        removeFigure(figureId)
    }, [removeFigure])

    useEffect(() => {
        scrollDebugLog.reset(SCROLL_SOURCE)
    }, [])

    useEffect(() => {
        const scrollEl = scrollRef.current

        if (!scrollEl) {
            return
        }

        const onScroll = () => {
            scrollDebugLog.scroll({
                source: SCROLL_SOURCE,
                element: scrollEl,
            })
        }

        scrollEl.addEventListener('scroll', onScroll, { passive: true })

        return () => scrollEl.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        if (state.figureCatalog.length <= catalogLengthRef.current || !activeFigure) {
            catalogLengthRef.current = state.figureCatalog.length
            return
        }

        catalogLengthRef.current = state.figureCatalog.length

        const scrollEl = scrollRef.current
        const item = scrollEl?.querySelector(`[data-figure-id="${activeFigure}"]`)

        if (scrollEl) {
            scrollDebugLog.scrollIntoView({
                source: SCROLL_SOURCE,
                targetId: activeFigure,
                element: scrollEl,
            })
        }

        item?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
        })
    }, [state.figureCatalog.length, activeFigure])

    return (
        <div className={styles.figuresPanel} style={figuresPanelStyle}>
            <div className={styles.figureStrip}>
                <button
                    type="button"
                    className={styles.addButton}
                    onClick={handleAddFigure}
                    title="Добавить фигуру"
                >
                    +
                </button>
                <HiddenScroll
                    ref={scrollRef}
                    direction="horizontal"
                    className={styles.figureStripScroll}
                    trackClassName={styles.figureStripTrack}
                    onWheelDebug={info => {
                        const scrollEl = scrollRef.current

                        if (!scrollEl) {
                            return
                        }

                        scrollDebugLog.wheel({
                            source: SCROLL_SOURCE,
                            deltaX: info.deltaX,
                            deltaY: info.deltaY,
                            combinedDelta: info.combinedDelta,
                            scrollLeftBefore: info.scrollPositionBefore,
                            scrollLeftAfter: info.scrollPositionAfter,
                            prevented: info.prevented,
                            handled: info.handled,
                            skipReason: info.skipReason,
                            element: scrollEl,
                        })
                    }}
                >
                    {state.figureCatalog.map(entry => {
                        const isActive = activeFigure === entry.id
                        const isArrange = isActive && isFigureArrangeEnabled(entry.id)

                        return (
                            <FigureButton
                                key={entry.id}
                                figureId={entry.id}
                                onClick={handleFigureClick}
                                isActive={isActive}
                                highlightArrange={isArrange}
                                stateIndex={isActive ? getFigureStateIndex(entry.id) : 0}
                                canDelete={canDeleteFigure}
                                onDelete={handleRemoveFigure}
                            />
                        )
                    })}
                </HiddenScroll>
            </div>
            <FigureParametersForm />
        </div>
    )
}
