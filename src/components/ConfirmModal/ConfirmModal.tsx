import React, { FC, ReactNode, useCallback, useEffect, useRef } from 'react'
import styles from './ConfirmModal.module.css'

export interface ConfirmModalProps {
    open: boolean
    title: string
    message: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    /** Single-button alert mode (no cancel). */
    alert?: boolean
    /** Emphasize the confirm action (e.g. delete). */
    destructive?: boolean
    onConfirm: () => void
    onCancel?: () => void
}

export const ConfirmModal: FC<ConfirmModalProps> = ({
    open,
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Отмена',
    alert = false,
    destructive = false,
    onConfirm,
    onCancel,
}) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null)

    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel()
            return
        }

        onConfirm()
    }, [onCancel, onConfirm])

    const handleOverlayClick = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            handleCancel()
        }
    }, [handleCancel])

    useEffect(() => {
        if (!open) {
            return
        }

        confirmButtonRef.current?.focus()

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleCancel()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, handleCancel])

    if (!open) {
        return null
    }

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
                <h2 className={styles.title} id="confirm-modal-title">{title}</h2>
                <div className={styles.message}>{message}</div>
                <div className={styles.actions}>
                    {!alert && (
                        <button type="button" onClick={handleCancel}>
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        className={destructive ? styles.destructiveButton : styles.confirmButton}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
