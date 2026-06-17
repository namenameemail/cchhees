import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { FigureId } from '../types/figures'
import { ScalableFigurePreview } from './ScalableFigurePreview'
import styles from './FigureButton.module.css'

const DELETE_HOLD_MS = 1000

export interface FigureButtonProps {
    figureId: FigureId
    onClick: (figureId: FigureId) => void
    isActive?: boolean
    highlightArrange?: boolean
    stateIndex?: number
    canDelete?: boolean
    onDelete?: (figureId: FigureId) => void
}

export const FigureButton: FC<FigureButtonProps> = ({
    figureId,
    onClick,
    isActive,
    highlightArrange,
    stateIndex = 0,
    canDelete = false,
    onDelete,
}) => {
    const [isHolding, setIsHolding] = useState(false)
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleClick = useCallback(() => {
        onClick(figureId)
    }, [onClick, figureId])

    const clearHold = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsHolding(false)
    }, [])

    const handleDeletePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        if (!canDelete || !onDelete) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsHolding(true)
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            setIsHolding(false)
            onDelete(figureId)
        }, DELETE_HOLD_MS)
    }, [canDelete, figureId, onDelete])

    const handleDeletePointerEnd = useCallback(() => {
        clearHold()
    }, [clearHold])

    useEffect(() => () => clearHold(), [clearHold])

    const showDelete = canDelete && onDelete != null

    return (
        <div
            className={cn(styles.item, isHolding && styles.itemHoldDeleting)}
            title={figureId}
            data-figure-id={figureId}
            onClick={handleClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleClick()
                }
            }}
            role="button"
            tabIndex={0}
        >
            {showDelete ? (
                <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label={`Удалить ${figureId}`}
                    onClick={event => event.stopPropagation()}
                    onDoubleClick={event => event.stopPropagation()}
                    onPointerDown={handleDeletePointerDown}
                    onPointerUp={handleDeletePointerEnd}
                    onPointerCancel={handleDeletePointerEnd}
                    onLostPointerCapture={handleDeletePointerEnd}
                >
                    ×
                </button>
            ) : null}
            <div className={cn(styles.figureButton, isActive && styles.figureButtonActive)}>
                <ScalableFigurePreview
                    figureId={figureId}
                    stateIndex={stateIndex}
                    highlightSelection={highlightArrange}
                />
            </div>
        </div>
    )
}
