import React, { FC, useCallback, useMemo } from 'react'
import { Form1 } from '../../../components/Form1'
import { useGameContext } from '../../context'
import { BoardMarkAppearance, BoardMarkKind, BoardMarksSettings } from '../../types/boardMarks'
import { DEFAULT_BOARD_MARKS, resolveBoardMarks } from '../../boardMarks'
import { createBoardMarkAppearanceConfig } from './boardMarkAppearanceForm'
import styles from './styles.module.css'

const MARK_SECTIONS: Array<{ kind: BoardMarkKind; label: string }> = [
    { kind: 'selection', label: 'выделение' },
    { kind: 'legalMove', label: 'ход' },
    { kind: 'cursor', label: 'курсор' },
]

interface BoardMarkSectionFormProps {
    kind: BoardMarkKind
    label: string
    value: BoardMarkAppearance
    onChange: (kind: BoardMarkKind, next: BoardMarkAppearance) => void
}

const BoardMarkSectionForm: FC<BoardMarkSectionFormProps> = ({
    kind,
    label,
    value,
    onChange,
}) => {
    const config = useMemo(
        () => createBoardMarkAppearanceConfig(value),
        [value],
    )

    const handleChange = useCallback((next: BoardMarkAppearance) => {
        onChange(kind, next)
    }, [kind, onChange])

    return (
        <section className={styles.markSection}>
            <h4 className={styles.markSectionTitle}>{label}</h4>
            <Form1<BoardMarkAppearance>
                className={styles.boardParametersForm}
                fieldLayout="labeled"
                value={value}
                config={config}
                onChange={handleChange}
            />
        </section>
    )
}

export const BoardMarksForm: FC = () => {
    const { state, setBoardParameters } = useGameContext()

    const boardMarks = useMemo(
        () => resolveBoardMarks(state.boardParameters),
        [state.boardParameters],
    )

    const handleMarkChange = useCallback((
        kind: BoardMarkKind,
        nextAppearance: BoardMarkAppearance,
    ) => {
        const currentMarks: BoardMarksSettings = {
            ...DEFAULT_BOARD_MARKS,
            ...state.boardParameters.boardMarks,
            ...resolveBoardMarks(state.boardParameters),
        }

        setBoardParameters({
            ...state.boardParameters,
            boardMarks: {
                ...currentMarks,
                [kind]: nextAppearance,
            },
        })
    }, [setBoardParameters, state.boardParameters])

    return (
        <div className={styles.boardMarksForm}>
            {MARK_SECTIONS.map(section => (
                <BoardMarkSectionForm
                    key={section.kind}
                    kind={section.kind}
                    label={section.label}
                    value={boardMarks[section.kind]}
                    onChange={handleMarkChange}
                />
            ))}
        </div>
    )
}
