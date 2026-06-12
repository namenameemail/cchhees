import React, { FC } from 'react'
import { ConfirmModal } from '../../components/ConfirmModal'

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
    return (
        <ConfirmModal
            open={open}
            title="Уменьшение доски"
            message={
                count === 1
                    ? '1 фигура окажется за пределами новой сетки и будет удалена.'
                    : `${count} фигур окажутся за пределами новой сетки и будут удалены.`
            }
            confirmLabel="Удалить и применить"
            destructive
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
