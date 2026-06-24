import React, { FC, useCallback, useMemo } from 'react'
import { NumberDragPointerLockInput } from 'bbuutoonnss'
import { FormArray } from '../../../components/FormArray'
import { FigureId, FigureMoveRule, FigureMoveVariant, FigureMoveVariantKind } from '../../types/figures'
import { FigureEventCondition } from '../../types/events'
import { cloneMoveRule } from '../../migrateFigureMoveRules'
import { createMoveConditionsArrayProps } from '../eventConditionsForm'
import { clampMoveRuleLength } from '../FigureMoveRulesGrid/moveRulesGrid'
import styles from './MoveRuleVariantsPanel.module.css'
import formStyles from '../FigureParametersForm/styles.module.css'

export interface MoveRuleVariantsPanelProps {
    figureId: FigureId
    rule: FigureMoveRule | null
    onChange: (rule: FigureMoveRule) => void
    onRemove: () => void
}

const VARIANT_LABELS: Record<FigureMoveVariantKind, string> = {
    empty: 'Пустая',
    capture: 'Занятая',
    jumpOver: 'Перепрыг',
}

const VARIANT_OWN_TEAM_LABELS: Partial<Record<FigureMoveVariantKind, string>> = {
    capture: 'своя команда',
    jumpOver: 'своя команда',
}

interface VariantRowProps {
    kind: FigureMoveVariantKind
    variant: FigureMoveVariant
    figureId: FigureId
    onVariantChange: (kind: FigureMoveVariantKind, next: FigureMoveVariant) => void
}

const VariantRow: FC<VariantRowProps> = ({
    kind,
    variant,
    figureId,
    onVariantChange,
}) => {
    const conditionsArrayProps = useMemo(
        () => createMoveConditionsArrayProps(figureId),
        [figureId],
    )

    const handleEnabledChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onVariantChange(kind, { ...variant, enabled: event.target.checked })
    }, [kind, onVariantChange, variant])

    const handleLengthChange = useCallback((value: number) => {
        onVariantChange(kind, { ...variant, length: clampMoveRuleLength(value) })
    }, [kind, onVariantChange, variant])

    const handleAllowOwnTeamChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onVariantChange(kind, { ...variant, allowOwnTeam: event.target.checked })
    }, [kind, onVariantChange, variant])

    const handleEmptyPathChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onVariantChange(kind, { ...variant, emptyPath: event.target.checked })
    }, [kind, onVariantChange, variant])

    const handleConditionsChange = useCallback((conditions: FigureEventCondition[]) => {
        onVariantChange(kind, { ...variant, conditions })
    }, [kind, onVariantChange, variant])

    const ownTeamLabel = VARIANT_OWN_TEAM_LABELS[kind]

    return (
        <div className={styles.variantRow}>
            <div className={styles.variantHeader}>
                <label className={styles.variantEnabled}>
                    <input
                        type="checkbox"
                        checked={variant.enabled}
                        onChange={handleEnabledChange}
                    />
                    <span>{VARIANT_LABELS[kind]}</span>
                </label>
                <label className={styles.variantLength}>
                    length
                    <NumberDragPointerLockInput
                        className={formStyles.gridNInput}
                        value={variant.length}
                        onChange={handleLengthChange}
                        min={0}
                        max={100}
                        step={1}
                        changeOnChange
                        changeOnBlur
                        resetOnBlur
                        title={kind === 'jumpOver' ? 'Макс. число фигур для перепрыга. 0 — без ограничения.' : 'Макс. шагов. 0 — бесконечно.'}
                    />
                </label>
                {ownTeamLabel ? (
                    <label className={styles.variantOwnTeam}>
                        <input
                            type="checkbox"
                            checked={variant.allowOwnTeam === true}
                            onChange={handleAllowOwnTeamChange}
                        />
                        <span>{ownTeamLabel}</span>
                    </label>
                ) : null}
                {kind === 'empty' ? (
                    <label className={styles.variantOwnTeam}>
                        <input
                            type="checkbox"
                            checked={variant.emptyPath === true}
                            onChange={handleEmptyPathChange}
                        />
                        <span
                            title="Путь по минимальным единичным шагам; для (2,0) проверяется (1,0), для (2,1) — нет промежуточных"
                        >
                            пустой путь
                        </span>
                    </label>
                ) : null}
            </div>
            <FormArray<FigureEventCondition>
                {...conditionsArrayProps}
                value={variant.conditions ?? []}
                onChange={handleConditionsChange}
            />
        </div>
    )
}

export const MoveRuleVariantsPanel: FC<MoveRuleVariantsPanelProps> = ({
    figureId,
    rule,
    onChange,
    onRemove,
}) => {
    const handleVariantChange = useCallback((kind: FigureMoveVariantKind, next: FigureMoveVariant) => {
        if (!rule) {
            return
        }

        onChange({
            ...rule,
            [kind]: next,
        })
    }, [onChange, rule])

    if (!rule) {
        return (
            <div className={styles.panel}>
                <p className={styles.placeholder}>Выберите направление на сетке</p>
            </div>
        )
    }

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <span className={styles.offsetLabel}>({rule.x}, {rule.y})</span>
                <button type="button" className={styles.removeButton} onClick={onRemove}>
                    удалить
                </button>
            </div>
            {(['empty', 'capture', 'jumpOver'] as const).map(kind => (
                <VariantRow
                    key={kind}
                    kind={kind}
                    variant={rule[kind]}
                    figureId={figureId}
                    onVariantChange={handleVariantChange}
                />
            ))}
        </div>
    )
}

export function updateMoveRuleAt(
    rules: FigureMoveRule[],
    updated: FigureMoveRule,
): FigureMoveRule[] {
    return rules.map(rule => (
        rule.x === updated.x && rule.y === updated.y ? cloneMoveRule(updated) : rule
    ))
}
