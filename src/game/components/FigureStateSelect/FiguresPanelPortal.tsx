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
import selectStyles from './FigureStateSelect.module.css'

const PANEL_Z_INDEX = 10000
const VIEWPORT_PADDING = 4

function clampPanelLeft(left: number, panelWidth: number): number {
    const maxLeft = window.innerWidth - panelWidth - VIEWPORT_PADDING

    return Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft))
}

function clampPanelTop(top: number, panelHeight: number): number {
    const maxTop = window.innerHeight - panelHeight - VIEWPORT_PADDING

    return Math.max(VIEWPORT_PADDING, Math.min(top, maxTop))
}

function useFixedPanelStyle(
    anchorRef: RefObject<HTMLElement | null>,
    panelRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    width: number,
    layoutDeps: unknown[],
): CSSProperties {
    const [style, setStyle] = useState<CSSProperties>({})

    const update = useCallback(() => {
        const anchor = anchorRef.current
        const panel = panelRef.current

        if (!anchor || !panel) {
            return
        }

        const rect = anchor.getBoundingClientRect()
        const panelWidth = panel.offsetWidth || width
        const panelHeight = panel.offsetHeight
        const spaceBelow = window.innerHeight - rect.top
        const spaceAbove = rect.bottom
        const upward = spaceBelow < panelHeight && spaceAbove >= spaceBelow
        const top = clampPanelTop(
            upward ? rect.bottom - panelHeight : rect.top,
            panelHeight,
        )

        setStyle({
            position: 'fixed',
            left: clampPanelLeft(rect.left, panelWidth),
            top,
            width,
            zIndex: PANEL_Z_INDEX,
        })
    }, [anchorRef, panelRef, width])

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

    return style
}

export interface FiguresPanelPortalProps {
    anchorRef: RefObject<HTMLElement | null>
    panelRef: RefObject<HTMLDivElement | null>
    isOpen: boolean
    width: number
    layoutDeps?: unknown[]
    className?: string
    onMouseEnter?: () => void
    onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void
    onBlur?: (event: FocusEvent<HTMLDivElement>) => void
    children: ReactNode
}

export function FiguresPanelPortal({
    anchorRef,
    panelRef,
    isOpen,
    width,
    layoutDeps = [],
    className,
    children,
    onMouseEnter,
    onMouseLeave,
    onBlur,
}: FiguresPanelPortalProps) {
    const style = useFixedPanelStyle(anchorRef, panelRef, isOpen, width, layoutDeps)

    if (!isOpen || typeof document === 'undefined') {
        return null
    }

    return createPortal(
        <div
            ref={panelRef}
            className={cn(selectStyles.figuresPanel, selectStyles.figuresPanelPortal, className)}
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
