import React, { FC, useCallback } from 'react'
import styles from './ShrinkBoardWarningModal.module.css'

export interface ShrinkBoardWarningModalProps {
    open: boolean
    count: number
    onConfirm: () => void
    onCancel: () => void
}

export const ShrinkBoardWarningModal: FC<ShrinkBoardWarningModalProps> = ({
    open,
    count,
    onConfirm,
    onCancel,
}) => {
    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel()
        }
    }, [onCancel])

    if (!open) {
        return null
    }

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <h2 className={styles.title}>Уменьшение доски</h2>
                <p className={styles.message}>
                    {count === 1
                        ? '1 фигура окажется за пределами новой сетки и будет удалена.'
                        : `${count} фигур окажутся за пределами новой сетки и будут удалены.`}
                </p>
                <div className={styles.actions}>
                    <button type="button" onClick={onCancel}>Отмена</button>
                    <button type="button" onClick={onConfirm}>Удалить и применить</button>
                </div>
            </div>
        </div>
    )
}
