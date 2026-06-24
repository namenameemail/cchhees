import React, {
    useCallback,
    useLayoutEffect,
    useState,
    type CSSProperties,
    type FocusEvent,
    type MouseEvent,
    type ReactNode,
    type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import cn from 'classnames'
import { computeStatesPanelFixedStyle } from './panelPosition'
import selectStyles from './FigureStateSelect.module.css'

export interface StatesPanelPortalProps {
    tileRef: RefObject<HTMLElement | null>
    isOpen: boolean
    previewSize: number
    stateCount: number
    panelRef: RefObject<HTMLDivElement | null>
    className?: string
    layoutDeps?: unknown[]
    onMouseEnter?: () => void
    onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void
    onBlur?: (event: FocusEvent<HTMLDivElement>) => void
    children: ReactNode
}

export function StatesPanelPortal({
    tileRef,
    isOpen,
    previewSize,
    stateCount,
    panelRef,
    className,
    layoutDeps = [],
    children,
    onMouseEnter,
    onMouseLeave,
    onBlur,
}: StatesPanelPortalProps) {
    const [style, setStyle] = useState<CSSProperties>({})

    const update = useCallback(() => {
        const tile = tileRef.current

        if (!tile) {
            return
        }

        setStyle(computeStatesPanelFixedStyle(
            tile.getBoundingClientRect(),
            previewSize,
            stateCount,
        ))
    }, [tileRef, previewSize, stateCount])

    useLayoutEffect(() => {
        if (!isOpen) {
            return
        }

        update()
        const frame = requestAnimationFrame(update)

        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)

        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('resize', update)
            window.removeEventListener('scroll', update, true)
        }
    }, [isOpen, update, ...layoutDeps])

    if (!isOpen || typeof document === 'undefined') {
        return null
    }

    return createPortal(
        <div
            ref={panelRef}
            className={cn(selectStyles.statesPanel, selectStyles.statesPanelPortal, className)}
            style={style}
            tabIndex={-1}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onBlur={onBlur}
        >
            {children}
        </div>,
        document.body,
    )
}
