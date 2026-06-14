import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cn from 'classnames'
import { filterCssNamedColors } from './cssNamedColors'
import styles from './ColorAutocompleteInput.module.css'

const SUGGESTION_LIMIT = 5
const PICKER_HINT = 'Двойной клик — палитра цвета'

function toPickerHex(value: string): string {
    const trimmed = value.trim()

    return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : '#000000'
}

export interface ColorAutocompleteInputProps {
    className?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    title?: string
    label?: string
    disabled?: boolean
    changeOnBlur?: boolean
    resetOnBlur?: boolean
    changeOnEnter?: boolean
}

export function ColorAutocompleteInput({
    className,
    value,
    onChange,
    placeholder,
    title,
    label,
    disabled = false,
    changeOnBlur = true,
    resetOnBlur = true,
    changeOnEnter = true,
}: ColorAutocompleteInputProps) {
    const pickerRef = useRef<HTMLInputElement>(null)
    const [draft, setDraft] = useState(value)
    const [isFocused, setIsFocused] = useState(false)
    const [isListHovered, setIsListHovered] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)

    useEffect(() => {
        setDraft(value)
    }, [value])

    const suggestions = useMemo(() => {
        if (draft.trim() === '') {
            return []
        }

        return filterCssNamedColors(draft, SUGGESTION_LIMIT)
    }, [draft])

    const showList = !disabled
        && (isFocused || isListHovered)
        && draft.trim() !== ''
        && suggestions.length > 0

    useEffect(() => {
        setActiveIndex(-1)
    }, [draft])

    const commit = useCallback((next: string) => {
        onChange(next)
    }, [onChange])

    const handleSelect = useCallback((colorName: string) => {
        setDraft(colorName)
        commit(colorName)
        setIsFocused(false)
        setIsListHovered(false)
        setActiveIndex(-1)
    }, [commit])

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setDraft(event.target.value)
    }, [])

    const openPicker = useCallback(() => {
        if (disabled) {
            return
        }

        pickerRef.current?.click()
    }, [disabled])

    const handleDoubleClick = useCallback(() => {
        openPicker()
    }, [openPicker])

    const handlePickerChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value
        setDraft(next)
        commit(next)
    }, [commit])

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (showList) {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex(index => {
                    const length = suggestions.length
                    if (length === 0) {
                        return -1
                    }

                    if (index < 0) {
                        return 0
                    }

                    return (index + 1) % length
                })
                return
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex(index => {
                    const length = suggestions.length
                    if (length === 0) {
                        return -1
                    }

                    if (index < 0) {
                        return length - 1
                    }

                    return (index - 1 + length) % length
                })
                return
            }

            if (event.key === 'Enter') {
                event.preventDefault()

                if (activeIndex >= 0) {
                    handleSelect(suggestions[activeIndex])
                } else if (changeOnEnter) {
                    commit(draft)
                }

                return
            }
        }

        if (changeOnEnter && event.key === 'Enter') {
            commit(draft)
        }
    }, [
        showList,
        suggestions,
        activeIndex,
        handleSelect,
        changeOnEnter,
        commit,
        draft,
    ])

    const handleFocus = useCallback(() => {
        setIsFocused(true)
    }, [])

    const handleBlur = useCallback(() => {
        if (changeOnBlur) {
            commit(draft)
        } else if (resetOnBlur) {
            setDraft(value)
        }

        setIsFocused(false)
        setActiveIndex(-1)
    }, [changeOnBlur, resetOnBlur, commit, draft, value])

    const handleListEnter = useCallback(() => {
        setIsListHovered(true)
    }, [])

    const handleListLeave = useCallback(() => {
        setIsListHovered(false)
    }, [])

    const handleOptionMouseDown = useCallback((event: React.MouseEvent, colorName: string) => {
        event.preventDefault()
        handleSelect(colorName)
    }, [handleSelect])

    const inputTitle = [title, PICKER_HINT].filter(Boolean).join('. ')
    const previewColor = draft.trim()

    const field = (
        <div className={cn(styles.colorAutocomplete, className)}>
            <div className={styles.inputRow}>
                <input
                    className="blur-text-input"
                    type="text"
                    value={draft}
                    disabled={disabled}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onDoubleClick={handleDoubleClick}
                    placeholder={placeholder}
                    title={inputTitle}
                />
                <span
                    className={cn(
                        styles.previewSwatch,
                        !previewColor && styles.previewSwatchEmpty,
                    )}
                    style={previewColor ? { backgroundColor: previewColor } : undefined}
                    title={previewColor || undefined}
                    aria-hidden
                />
            </div>
            <input
                ref={pickerRef}
                type="color"
                className={styles.hiddenPicker}
                value={toPickerHex(draft)}
                disabled={disabled}
                tabIndex={-1}
                aria-hidden
                onChange={handlePickerChange}
            />
            {showList && (
                <div
                    className={styles.list}
                    onMouseEnter={handleListEnter}
                    onMouseLeave={handleListLeave}
                >
                    {suggestions.map((colorName, index) => (
                        <button
                            key={colorName}
                            type="button"
                            className={cn(
                                styles.option,
                                index === activeIndex && styles.optionActive,
                            )}
                            onMouseDown={(event) => handleOptionMouseDown(event, colorName)}
                        >
                            <span
                                className={styles.swatch}
                                style={{ backgroundColor: colorName }}
                            />
                            <span className={styles.name}>{colorName}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )

    if (!label) {
        return field
    }

    return (
        <label className={styles.colorField}>
            <span className={styles.colorFieldLabel}>{label}</span>
            {field}
        </label>
    )
}
