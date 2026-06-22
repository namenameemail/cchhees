import React, {
    FC,
    useCallback,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import { FigureId } from '../../types/figures'
import { resolveStripCellPixelSize } from '../../figureCellFit'
import { FigureSVG } from '../FigureSVG'
import { FiguresPanelPortal } from '../FigureStateSelect/FiguresPanelPortal'
import selectStyles from '../FigureStateSelect/FigureStateSelect.module.css'
import filterStyles from '../FigureStateSelect/FigureFilterArrayField.module.css'
import styles from './TeamFiguresPicker.module.css'

const FIGURES_PER_ROW = 5

export interface TeamFiguresPickerProps {
    selectedFigureIds: FigureId[]
    onChange: (figureIds: FigureId[]) => void
}

export const TeamFiguresPicker: FC<TeamFiguresPickerProps> = ({
    selectedFigureIds,
    onChange,
}) => {
    const { state } = useGameContext()
    const { figureCatalog, boardParameters: { cellXDistance, cellYDistance } } = state

    const [rootHovered, setRootHovered] = useState(false)
    const [panelHovered, setPanelHovered] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    const previewSize = useMemo(
        () => resolveStripCellPixelSize(cellXDistance, cellYDistance).width,
        [cellXDistance, cellYDistance],
    )

    const panelWidth = FIGURES_PER_ROW * previewSize

    const selectedSet = useMemo(
        () => new Set(selectedFigureIds),
        [selectedFigureIds],
    )

    const isOpen = rootHovered || panelHovered

    const handleToggleFigure = useCallback((figureId: FigureId, event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()

        if (selectedSet.has(figureId)) {
            onChange(selectedFigureIds.filter(id => id !== figureId))
            return
        }

        onChange([...selectedFigureIds, figureId])
    }, [onChange, selectedFigureIds, selectedSet])

    return (
        <div
            ref={rootRef}
            className={styles.root}
            onMouseEnter={() => setRootHovered(true)}
            onMouseLeave={() => setRootHovered(false)}
        >
            <div className={cn(filterStyles.trigger, !isOpen && filterStyles.triggerActive)}>
                {selectedFigureIds.length === 0 ? (
                    <div
                        className={cn(selectStyles.previewTile, filterStyles.triggerTile)}
                        style={{ width: previewSize, height: previewSize }}
                    >
                        <span className={selectStyles.filterPlaceholder}>?</span>
                    </div>
                ) : (
                    selectedFigureIds.map(figureId => (
                        <div
                            key={figureId}
                            className={cn(selectStyles.previewTile, filterStyles.triggerTile)}
                            style={{ width: previewSize, height: previewSize }}
                        >
                            <FigureSVG
                                figureId={figureId}
                                stateIndex={0}
                                width={previewSize}
                                height={previewSize}
                            />
                        </div>
                    ))
                )}
            </div>

            {isOpen && (
                <FiguresPanelPortal
                    anchorRef={rootRef}
                    panelRef={panelRef}
                    isOpen={isOpen}
                    width={panelWidth}
                    layoutDeps={[figureCatalog.length, previewSize]}
                    onMouseEnter={() => setPanelHovered(true)}
                    onMouseLeave={() => setPanelHovered(false)}
                >
                    <div
                        className={selectStyles.figuresPanelScroll}
                        style={{ gridTemplateColumns: `repeat(${FIGURES_PER_ROW}, ${previewSize}px)` }}
                    >
                        {figureCatalog.map(entry => {
                            const isSelected = selectedSet.has(entry.id)

                            return (
                                <div
                                    key={entry.id}
                                    className={cn(
                                        selectStyles.previewTile,
                                        selectStyles.figureTile,
                                        isSelected && filterStyles.figureTileSelected,
                                    )}
                                    style={{ width: previewSize, height: previewSize }}
                                    onClick={event => handleToggleFigure(entry.id, event)}
                                >
                                    <FigureSVG
                                        figureId={entry.id}
                                        stateIndex={0}
                                        width={previewSize}
                                        height={previewSize}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </FiguresPanelPortal>
            )}
        </div>
    )
}
