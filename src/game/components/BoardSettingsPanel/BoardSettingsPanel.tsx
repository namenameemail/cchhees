import React, { FC, useCallback, useMemo, useState } from 'react'
import cn from 'classnames'
import { useGameContext } from '../../context'
import { Form1, ParameterInputComponentProps } from '../../../components/Form1'
import {
    BoardBackgroundImageFit,
    BoardParameters,
} from '../../types/boardParameters'
import { Form1FieldConfig, ParameterTypes } from '../../../components/Form1/types'
import { atLeastOne, integerStep, nonNegative } from '../../../components/Form1/numberInputConstraints'
import { ProjectImageSelect } from '../../../projects/components/ProjectImageSelect'
import { BoardStyleRules } from '../BoardStyleRules'
import { BoardAxisNumberingsForm } from './BoardAxisNumberingsForm'
import { BoardMarksForm } from './BoardMarksForm'
import { normalizeAxisNumberingForBoard, resolveAxisNumberings } from '../../boardAxisLabels'
import styles from './styles.module.css'

type BoardSectionTab = 'view' | 'cells' | 'numbering' | 'marks'

const BOARD_SECTION_TABS: Array<{ id: BoardSectionTab; label: string }> = [
    { id: 'view', label: 'вид' },
    { id: 'cells', label: 'клетки' },
    { id: 'numbering', label: 'нумерация' },
    { id: 'marks', label: 'отметки' },
]

const BackgroundAssetSelectField: FC<ParameterInputComponentProps> = ({ name, value, onChange }) => {
    const hasAsset = typeof value === 'number'

    return (
        <ProjectImageSelect
            name={name}
            value={hasAsset ? value : null}
            placeholder="background image"
            title="background image"
            clearable
            onChange={(assetId) => onChange(name, assetId)}
        />
    )
}

const BOARD_DIMENSION_DRAG_PIXELS_PER_STEP = 12

const viewParametersConfig = (value: BoardParameters): Form1FieldConfig<BoardParameters>[] => {
    const hasBackgroundImage = value.backgroundAssetId != null
    const imageFit = value.backgroundImageFit ?? BoardBackgroundImageFit.tile

    return [
        {
            name: 'n',
            label: 'n',
            type: ParameterTypes.NumberInput,
            props: {
                title: 'столбцы',
                ...atLeastOne,
                ...integerStep,
                dragPixelsPerStep: BOARD_DIMENSION_DRAG_PIXELS_PER_STEP,
            },
        },
        {
            name: 'm',
            label: 'm',
            type: ParameterTypes.NumberInput,
            props: {
                title: 'строки',
                ...atLeastOne,
                ...integerStep,
                dragPixelsPerStep: BOARD_DIMENSION_DRAG_PIXELS_PER_STEP,
            },
        },
        {
            name: 'cellXDistance',
            label: 'dx',
            type: ParameterTypes.NumberInput,
            props: { title: 'шаг по X', placeholder: 'cellXDistance', ...atLeastOne },
        },
        {
            name: 'cellYDistance',
            label: 'dy',
            type: ParameterTypes.NumberInput,
            props: { title: 'шаг по Y', placeholder: 'cellYDistance', ...atLeastOne },
        },
        {
            name: 'background',
            label: 'bg',
            type: ParameterTypes.ColorInput,
            props: { title: 'цвет фона', placeholder: 'background' },
        },
        {
            name: 'backgroundAssetId',
            label: 'img',
            Component: BackgroundAssetSelectField,
            props: { title: 'фоновое изображение' },
        },
        {
            name: 'backgroundImageFit',
            label: 'fit',
            type: ParameterTypes.SelectArray,
            visibility: () => hasBackgroundImage,
            props: {
                title: 'режим изображения',
                options: Object.values(BoardBackgroundImageFit),
            },
        },
        {
            name: 'backgroundRepeatWidth',
            label: 'rW',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'ширина повтора', placeholder: 'repeat width', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatHeight',
            label: 'rH',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'высота повтора', placeholder: 'repeat height', ...atLeastOne },
        },
        {
            name: 'backgroundRepeatOffsetX',
            label: 'oX',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'смещение повтора X', placeholder: 'repeat offsetX' },
        },
        {
            name: 'backgroundRepeatOffsetY',
            label: 'oY',
            type: ParameterTypes.NumberInput,
            visibility: () => hasBackgroundImage && imageFit === BoardBackgroundImageFit.repeat,
            props: { title: 'смещение повтора Y', placeholder: 'repeat offsetY' },
        },
        {
            name: 'borderRadius',
            label: 'br',
            type: ParameterTypes.NumberInput,
            props: { title: 'скругление рамки', placeholder: 'borderRadius', ...nonNegative },
        },
        {
            name: 'borderWidth',
            label: 'bw',
            type: ParameterTypes.NumberInput,
            props: { title: 'толщина рамки', placeholder: 'borderWidth', ...nonNegative },
        },
        {
            name: 'borderColor',
            label: 'bc',
            type: ParameterTypes.ColorInput,
            props: { title: 'цвет рамки', placeholder: 'borderColor' },
        },
        {
            name: 'borderDasharray',
            label: 'ds',
            type: ParameterTypes.TextInput,
            props: { title: 'штрих рамки (dasharray)', placeholder: 'borderDasharray' },
        },
    ]
}

export const BoardSettingsPanel: FC = () => {
    const { state, setBoardParameters, boardParametersFormKey } = useGameContext()
    const [activeSection, setActiveSection] = useState<BoardSectionTab>('view')
    const [pinnedSection, setPinnedSection] = useState<BoardSectionTab | null>(null)

    const handleViewChange = useCallback((value: BoardParameters) => {
        const numberings = resolveAxisNumberings(state.boardParameters).map(item =>
            normalizeAxisNumberingForBoard(item, value.n, value.m),
        )
        setBoardParameters({ ...value, axisNumberings: numberings })
    }, [setBoardParameters, state.boardParameters])

    const handleTabClick = useCallback((id: BoardSectionTab) => {
        setActiveSection(id)
    }, [])

    const handleTabDoubleClick = useCallback((id: BoardSectionTab) => {
        setPinnedSection(prev => prev === id ? null : id)
        setActiveSection(id)
    }, [])

    const visibleSections = useMemo((): BoardSectionTab[] => {
        if (!pinnedSection || pinnedSection === activeSection) return [activeSection]
        const pinnedIndex = BOARD_SECTION_TABS.findIndex(t => t.id === pinnedSection)
        const activeIndex = BOARD_SECTION_TABS.findIndex(t => t.id === activeSection)
        return activeIndex < pinnedIndex
            ? [activeSection, pinnedSection]
            : [pinnedSection, activeSection]
    }, [activeSection, pinnedSection])

    const tabClass = (id: BoardSectionTab) => {
        if (id === pinnedSection) return styles.sectionTabPinned
        if (id === activeSection) return styles.sectionTabActive
        return styles.sectionTab
    }

    return (
        <div className={styles.boardSettingsLayout}>
            <div className={styles.sectionTabsRow}>
                {BOARD_SECTION_TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={tabClass(tab.id)}
                        onClick={() => handleTabClick(tab.id)}
                        onDoubleClick={() => handleTabDoubleClick(tab.id)}
                        title={tab.id === pinnedSection ? 'двойной клик — открепить' : 'двойной клик — закрепить'}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className={styles.sectionPanelsScroll}>
                {visibleSections.map(id => (
                    <div
                        key={id}
                        className={cn(styles.sectionPanel, id === 'view' && styles.viewSectionPanel)}
                    >
                        {id === 'view' && (
                            <Form1<BoardParameters>
                                key={boardParametersFormKey}
                                className={styles.boardParametersForm}
                                fieldLayout="labeled"
                                value={state.boardParameters}
                                config={viewParametersConfig}
                                onChange={handleViewChange}
                            />
                        )}
                        {id === 'cells' && <BoardStyleRules />}
                        {id === 'numbering' && <BoardAxisNumberingsForm />}
                        {id === 'marks' && <BoardMarksForm />}
                    </div>
                ))}
            </div>
        </div>
    )
}
