import React, { FC, useCallback, useEffect, useRef } from 'react'
import cn from 'classnames'
import { HiddenScroll } from 'bbuutoonnss'
import { useGameContext } from '../context'
import { FigureButton } from './FigureButton'
import { FigureId } from '../types/figures'
import { Mode } from '../types'
import { FigureParametersForm } from './FigureParametersForm/FigureParametersForm'
import { scrollDebugLog } from '../scrollDebugLog'
import styles from './Figures.module.css'

const SCROLL_SOURCE = 'figures'

export const Figures: FC = () => {
    const {
        mode,
        setMode,
        activeFigure,
        setActiveFigure,
        state,
        addFigure,
        removeFigure,
    } = useGameContext()

    const scrollRef = useRef<HTMLDivElement>(null)
    const catalogLengthRef = useRef(state.figureCatalog.length)
    const isArrangeMode = mode === Mode.FiguresArrange
    const canDeleteFigure = state.figureCatalog.length > 1

    const handleFigureClick = useCallback((figureId: FigureId) => {
        setActiveFigure(activeFigure === figureId ? undefined : figureId)
    }, [activeFigure, setActiveFigure])

    const handleArrangeModeClick = useCallback(() => {
        setMode(isArrangeMode ? Mode.Game : Mode.FiguresArrange)
    }, [setMode, isArrangeMode])

    const handleAddFigure = useCallback(() => {
        addFigure()
    }, [addFigure])

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
        <div className={styles.figuresPanel}>
            <div className={styles.figureStrip}>
                <div className={styles.figureStripAside}>
                    <button
                        type="button"
                        className={styles.addButton}
                        onClick={handleAddFigure}
                    >
                        add
                    </button>
                    <button
                        type="button"
                        className={cn(styles.arrangeButton, isArrangeMode && styles.arrangeButtonActive)}
                        onClick={handleArrangeModeClick}
                        disabled={!activeFigure}
                        title="Расставить выбранную фигуру на доске"
                    >
                        расстановка{isArrangeMode ? ' <' : ''}
                    </button>
                </div>
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
                    {state.figureCatalog.map(entry => (
                        <FigureButton
                            key={entry.id}
                            figureId={entry.id}
                            onClick={handleFigureClick}
                            isActive={activeFigure === entry.id}
                            canDelete={canDeleteFigure}
                            onDelete={handleRemoveFigure}
                        />
                    ))}
                </HiddenScroll>
            </div>
            <FigureParametersForm />
        </div>
    )
}
