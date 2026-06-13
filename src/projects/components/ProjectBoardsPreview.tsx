import React, { FC, useCallback, useState } from 'react'
import { FigureCatalog } from '../../game/types/figures'
import { getBoardPreviewBoxStyle } from '../boardPreviewSize'
import { BoardDocument, getBoardGameState } from '../types'
import styles from './ProjectsModal.module.css'

export interface ProjectBoardsPreviewProps {
    boards: BoardDocument[]
    figureCatalog: FigureCatalog
    projectPreviewDataUrl?: string
    maxSize?: number
}

export const PREVIEW_SIZE_MIN = 40
export const PREVIEW_SIZE_MAX = 128
export const PREVIEW_SIZE_DEFAULT = 56

function resolveBoardPreviewUrl(
    board: BoardDocument | undefined,
    boardIndex: number,
    projectPreviewDataUrl?: string,
): string | undefined {
    if (!board) {
        return undefined
    }

    if (board.previewDataUrl) {
        return board.previewDataUrl
    }

    if (boardIndex === 0) {
        return projectPreviewDataUrl
    }

    return undefined
}

function boardIndexFromPointer(clientX: number, rect: DOMRect, boardCount: number): number {
    if (boardCount <= 1) {
        return 0
    }

    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.min(boardCount - 1, Math.floor(ratio * boardCount))
}

export const ProjectBoardsPreview: FC<ProjectBoardsPreviewProps> = ({
    boards,
    figureCatalog,
    projectPreviewDataUrl,
    maxSize = 56,
}) => {
    const [boardIndex, setBoardIndex] = useState(0)

    const sizeBoard = boards[0]
    const previewBox = sizeBoard
        ? getBoardPreviewBoxStyle(
            getBoardGameState(sizeBoard, figureCatalog).boardParameters,
            maxSize,
        )
        : { width: maxSize, height: maxSize }

    const activeBoard = boards[boardIndex] ?? boards[0]
    const previewUrl = resolveBoardPreviewUrl(activeBoard, boardIndex, projectPreviewDataUrl)
    const boardName = activeBoard?.name ?? ''

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (boards.length <= 1) {
            return
        }

        const rect = event.currentTarget.getBoundingClientRect()
        setBoardIndex(boardIndexFromPointer(event.clientX, rect, boards.length))
    }, [boards.length])

    const handleMouseLeave = useCallback(() => {
        setBoardIndex(0)
    }, [])

    return (
        <div
            className={styles.preview}
            style={{
                width: previewBox.width,
                height: previewBox.height,
            }}
            title={boardName}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {previewUrl ? (
                <img
                    className={styles.previewImage}
                    src={previewUrl}
                    alt=""
                />
            ) : (
                <span className={styles.previewPlaceholder}>?</span>
            )}
            {boardName && (
                <span className={styles.previewBoardName}>{boardName}</span>
            )}
        </div>
    )
}
