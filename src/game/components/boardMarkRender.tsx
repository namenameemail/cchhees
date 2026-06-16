import React from 'react'
import { BoardMarkCircle } from './BoardMarkCircle'
import { ResolvedBoardMarks, isMarkLayer } from '../boardMarks'
import { BoardMarkKind, BoardMarkLayer } from '../types/boardMarks'

export interface BoardMarkGradientIds {
    selection?: string
    selectionOverlay?: string
    legalMove?: string
    legalMoveOverlay?: string
    cursor?: string
    cursorOverlay?: string
}

export function renderBoardMark(
    kind: BoardMarkKind,
    boardMarks: ResolvedBoardMarks,
    gradientIds: BoardMarkGradientIds,
    layer: BoardMarkLayer,
    visible: boolean,
    cx: number,
    cy: number,
    r: number,
) {
    const appearance = boardMarks[kind]

    if (!isMarkLayer(appearance, layer) || !visible) {
        return null
    }

    return (
        <BoardMarkCircle
            key={kind}
            kind={kind}
            appearance={appearance}
            gradientId={gradientIds[kind]}
            overlayGradientId={gradientIds[`${kind}Overlay` as keyof BoardMarkGradientIds]}
            cx={cx}
            cy={cy}
            r={r}
            visible
        />
    )
}
