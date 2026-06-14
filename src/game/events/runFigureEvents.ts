import { FigureCatalog } from '../types/figures'
import { FiguresSlice } from '../state/slices'
import { cloneFigurePlacement } from '../figureView'
import { collectTriggeredFigureEvents } from './match'
import { applyGameActions } from './execute'
import { MoveEventContext } from './types'
import { gameMovesDebugLog } from '../gameMovesDebugLog'

export function runFigureEvents(
    figures: FiguresSlice,
    ctx: MoveEventContext,
): FiguresSlice {
    const triggered = collectTriggeredFigureEvents(ctx, figures.figuresByCoord)
    let nextFigures: FiguresSlice = {
        figuresByCoord: Object.fromEntries(
            Object.entries(figures.figuresByCoord).map(([key, placement]) => [
                key,
                cloneFigurePlacement(placement),
            ]),
        ),
        tray: figures.tray.map(cloneFigurePlacement),
    }

    const catalogById = new Map<FigureCatalog[number]['id'], FigureCatalog[number]>(
        ctx.catalog.map(entry => [entry.id, entry]),
    )

    for (const event of triggered) {
        const definition = catalogById.get(event.ownerFigureId)
        const rule = definition?.eventRules?.find(item => item.id === event.ruleId)

        if (!rule) {
            continue
        }

        gameMovesDebugLog.figureEvent({
            eventType: rule.type,
            ownerFigureId: event.ownerFigureId,
            ruleId: event.ruleId,
            actions: rule.actions,
            areaAnchor: event.areaAnchor,
        })

        const actionCtx: MoveEventContext = {
            ...ctx,
            areaAnchor: event.areaAnchor,
        }

        nextFigures = applyGameActions(nextFigures, rule.actions, actionCtx)
    }

    return nextFigures
}
