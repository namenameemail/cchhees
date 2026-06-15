import React, { FC } from 'react'
import { buildMarkGradientDef, ResolvedBoardMarks } from '../boardMarks'
import { BoardMarkKind } from '../types/boardMarks'

export interface BoardMarkGradientDefsProps {
    boardMarks: ResolvedBoardMarks
    selectionGradientId: string
    selectionOverlayGradientId: string
    legalMoveGradientId: string
    legalMoveOverlayGradientId: string
    cursorGradientId: string
    cursorOverlayGradientId: string
}

function buildOverlayGradientDef(
    boardMarks: ResolvedBoardMarks,
    kind: BoardMarkKind,
    gradientId: string,
) {
    const overlay = boardMarks[kind].overlay

    if (!overlay?.fill) {
        return null
    }

    return buildMarkGradientDef(overlay.fill, gradientId)
}

export const BoardMarkGradientDefs: FC<BoardMarkGradientDefsProps> = ({
    boardMarks,
    selectionGradientId,
    selectionOverlayGradientId,
    legalMoveGradientId,
    legalMoveOverlayGradientId,
    cursorGradientId,
    cursorOverlayGradientId,
}) => (
    <>
        {buildMarkGradientDef(boardMarks.selection.fill, selectionGradientId)}
        {buildOverlayGradientDef(boardMarks, 'selection', selectionOverlayGradientId)}
        {buildMarkGradientDef(boardMarks.legalMove.fill, legalMoveGradientId)}
        {buildOverlayGradientDef(boardMarks, 'legalMove', legalMoveOverlayGradientId)}
        {buildMarkGradientDef(boardMarks.cursor.fill, cursorGradientId)}
        {buildOverlayGradientDef(boardMarks, 'cursor', cursorOverlayGradientId)}
    </>
)
