import React, {
    DragEvent,
    FC,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import cn from 'classnames'
import { useProjectContext } from '../ProjectContext'
import { formatMegabytes } from '../formatBytes'
import { isProjectImportFile, PROJECT_FILE_EXTENSION } from '../projectFile'
import { getProjectByteSize, readStorageEstimate, StorageEstimate } from '../storageEstimate'
import { Project } from '../types'
import { ProjectBoardsPreview, PREVIEW_SIZE_DEFAULT, PREVIEW_SIZE_MAX, PREVIEW_SIZE_MIN } from './ProjectBoardsPreview'
import styles from './ProjectsModal.module.css'

export interface ProjectsModalProps {
    open: boolean
    onClose: () => void
}

function formatUpdatedAt(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
}

function formatFreePercent(estimate: StorageEstimate): string {
    return `${estimate.freePercent.toFixed(1)}%`
}

function formatBoardCount(count: number): string {
    const mod10 = count % 10
    const mod100 = count % 100

    if (mod10 === 1 && mod100 !== 11) {
        return `${count} доска`
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return `${count} доски`
    }

    return `${count} досок`
}

const DELETE_HOLD_MS = 1000

interface HoldDeleteButtonProps {
    projectId: string
    label: string
    ariaLabel: string
    className?: string
    onHoldingChange: (projectId: string | null) => void
    onDelete: (projectId: string) => void
}

function HoldDeleteButton({
    projectId,
    label,
    ariaLabel,
    className,
    onHoldingChange,
    onDelete,
}: HoldDeleteButtonProps) {
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onHoldingChangeRef = useRef(onHoldingChange)
    const onDeleteRef = useRef(onDelete)

    onHoldingChangeRef.current = onHoldingChange
    onDeleteRef.current = onDelete

    const clearHold = useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }

        onHoldingChangeRef.current(null)
    }, [])

    const handleDeletePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        onHoldingChangeRef.current(projectId)
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            onHoldingChangeRef.current(null)
            onDeleteRef.current(projectId)
        }, DELETE_HOLD_MS)
    }, [projectId])

    const handleDeletePointerEnd = useCallback(() => {
        clearHold()
    }, [clearHold])

    useEffect(() => () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
    }, [])

    return (
        <button
            type="button"
            className={className}
            aria-label={ariaLabel}
            title="Удерживайте для удаления"
            onPointerDown={handleDeletePointerDown}
            onPointerUp={handleDeletePointerEnd}
            onPointerCancel={handleDeletePointerEnd}
            onLostPointerCapture={handleDeletePointerEnd}
        >
            {label}
        </button>
    )
}

export const ProjectsModal: FC<ProjectsModalProps> = ({ open, onClose }) => {
    const {
        projects,
        visitedRooms,
        currentProjectId,
        currentProjectKind,
        createProject,
        renameProject,
        deleteProject,
        switchProject,
        switchVisitedRoom,
        promoteVisitedRoomToLocal,
        exportProject,
        importProjectsFromFiles,
    } = useProjectContext()

    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [projectSizes, setProjectSizes] = useState<Record<string, number>>({})
    const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null)
    const [isImporting, setIsImporting] = useState(false)
    const [isDragActive, setIsDragActive] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [holdingDeleteId, setHoldingDeleteId] = useState<string | null>(null)
    const [showVisitedRooms, setShowVisitedRooms] = useState(false)
    const [previewSize, setPreviewSize] = useState(PREVIEW_SIZE_DEFAULT)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dragDepthRef = useRef(0)

    const refreshStorageInfo = useCallback(async () => {
        const [estimate, sizes] = await Promise.all([
            readStorageEstimate(),
            Promise.all(projects.map(async project => ({
                id: project.id,
                size: await getProjectByteSize(project),
            }))),
        ])

        setStorageEstimate(estimate)
        setProjectSizes(Object.fromEntries(sizes.map(item => [item.id, item.size])))
    }, [projects])

    useEffect(() => {
        if (!open) {
            return
        }

        void refreshStorageInfo()
    }, [open, refreshStorageInfo])

    useEffect(() => {
        if (visitedRooms.length === 0 && showVisitedRooms) {
            setShowVisitedRooms(false)
        }
    }, [visitedRooms.length, showVisitedRooms])

    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }, [onClose])

    const handleCreate = useCallback(async () => {
        await createProject()
        await refreshStorageInfo()
    }, [createProject, refreshStorageInfo])

    const handleSwitch = useCallback(async (id: string) => {
        await switchProject(id)
        onClose()
    }, [switchProject, onClose])

    const handleOpenVisitedRoom = useCallback(async (hostProjectId: string) => {
        await switchVisitedRoom(hostProjectId)
        onClose()
    }, [switchVisitedRoom, onClose])

    const handlePromoteVisitedRoom = useCallback(async (hostProjectId: string) => {
        await promoteVisitedRoomToLocal(hostProjectId)
        await refreshStorageInfo()
        setStatusMessage('Комната перенесена в локальные проекты')
    }, [promoteVisitedRoomToLocal, refreshStorageInfo])

    const handleStartRename = useCallback((id: string, name: string) => {
        setRenamingId(id)
        setRenameValue(name)
    }, [])

    const handleCancelRename = useCallback(() => {
        setRenamingId(null)
        setRenameValue('')
    }, [])

    const handleConfirmRename = useCallback(async (id: string) => {
        await renameProject(id, renameValue)
        handleCancelRename()
        await refreshStorageInfo()
    }, [renameProject, renameValue, handleCancelRename, refreshStorageInfo])

    const handleDelete = useCallback(async (id: string) => {
        await deleteProject(id)
        await refreshStorageInfo()
    }, [deleteProject, refreshStorageInfo])

    const handleHoldingDeleteChange = useCallback((projectId: string | null) => {
        setHoldingDeleteId(projectId)
    }, [])

    const handleExport = useCallback(async (id: string) => {
        try {
            await exportProject(id)
            setStatusMessage('Проект экспортирован')
        } catch (error) {
            console.error('[ProjectsModal] export failed:', error)
            setStatusMessage('Не удалось экспортировать проект')
        }
    }, [exportProject])

    const importFiles = useCallback(async (files: FileList | File[]) => {
        const importable = Array.from(files).filter(isProjectImportFile)

        if (importable.length === 0) {
            setStatusMessage(`Перетащите файл проекта (*${PROJECT_FILE_EXTENSION})`)
            return
        }

        setIsImporting(true)
        setStatusMessage(null)

        try {
            const imported = await importProjectsFromFiles(importable)

            if (imported) {
                setStatusMessage(
                    importable.length > 1
                        ? `Импортировано проектов: ${importable.length}`
                        : `Импортирован проект «${imported.name}»`,
                )
            }

            await refreshStorageInfo()
        } catch (error) {
            console.error('[ProjectsModal] import failed:', error)
            setStatusMessage(error instanceof Error ? error.message : 'Не удалось импортировать проект')
        } finally {
            setIsImporting(false)
        }
    }, [importProjectsFromFiles, refreshStorageInfo])

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            void importFiles(event.target.files)
            event.target.value = ''
        }
    }, [importFiles])

    const handleDragEnter = useCallback((event: DragEvent) => {
        event.preventDefault()
        dragDepthRef.current += 1
        setIsDragActive(true)
    }, [])

    const handleDragLeave = useCallback((event: DragEvent) => {
        event.preventDefault()
        dragDepthRef.current -= 1

        if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0
            setIsDragActive(false)
        }
    }, [])

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault()
    }, [])

    const handleDrop = useCallback((event: DragEvent) => {
        event.preventDefault()
        dragDepthRef.current = 0
        setIsDragActive(false)

        if (event.dataTransfer.files.length > 0) {
            void importFiles(event.dataTransfer.files)
        }
    }, [importFiles])

    const renderLocalProject = useCallback((project: Project) => {
        const isCurrent = currentProjectKind === 'local' && project.id === currentProjectId
        const isRenaming = renamingId === project.id
        const projectSize = projectSizes[project.id]

        return (
            <article
                key={project.id}
                className={cn(
                    styles.item,
                    isCurrent && styles.itemCurrent,
                    holdingDeleteId === project.id && styles.itemHoldDeleting,
                    isRenaming && styles.itemRenaming,
                )}
            >
                <ProjectBoardsPreview
                    boards={project.boards}
                    figureCatalog={project.figureCatalog}
                    projectPreviewDataUrl={project.previewDataUrl}
                    maxSize={previewSize}
                />

                <div className={styles.itemBody}>
                    <div className={styles.itemMain}>
                        {isRenaming ? (
                            <input
                                className={styles.renameInput}
                                value={renameValue}
                                autoFocus
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        void handleConfirmRename(project.id)
                                    }
                                    if (e.key === 'Escape') {
                                        handleCancelRename()
                                    }
                                }}
                            />
                        ) : (
                            <button
                                type="button"
                                className={styles.nameButton}
                                onClick={() => void handleSwitch(project.id)}
                            >
                                {project.name}
                                {isCurrent ? ' · текущий' : ''}
                            </button>
                        )}
                        <div className={styles.metaRow}>
                            <span className={styles.updatedAt}>
                                {formatUpdatedAt(project.updatedAt)}
                            </span>
                            <span className={styles.projectSize}>
                                {formatBoardCount(project.boards.length)}
                            </span>
                            {projectSize != null && (
                                <span className={styles.projectSize}>
                                    {formatMegabytes(projectSize)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        {isRenaming ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => void handleConfirmRename(project.id)}
                                >
                                    OK
                                </button>
                                <button type="button" onClick={handleCancelRename}>
                                    Отмена
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => void handleExport(project.id)}
                                >
                                    Экспорт
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStartRename(project.id, project.name)}
                                >
                                    Имя
                                </button>
                                <HoldDeleteButton
                                    projectId={project.id}
                                    label="Удалить"
                                    ariaLabel={`Удалить проект ${project.name}`}
                                    className={styles.deleteButton}
                                    onHoldingChange={handleHoldingDeleteChange}
                                    onDelete={id => void handleDelete(id)}
                                />
                            </>
                        )}
                    </div>
                </div>
            </article>
        )
    }, [
        currentProjectId,
        currentProjectKind,
        handleConfirmRename,
        handleCancelRename,
        handleDelete,
        handleExport,
        handleStartRename,
        handleSwitch,
        handleHoldingDeleteChange,
        holdingDeleteId,
        projectSizes,
        renameValue,
        renamingId,
        previewSize,
    ])

    if (!open) {
        return null
    }

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div
                className={`${styles.modal} ${isDragActive ? styles.modalDragActive : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {isDragActive && (
                    <div className={styles.dropOverlay}>
                        Отпустите файл {PROJECT_FILE_EXTENSION} для импорта
                    </div>
                )}

                <div className={styles.header}>
                    <div className={styles.headerActions}>
                        <button
                            type="button"
                            className={styles.headerButton}
                            onClick={handleImportClick}
                            disabled={isImporting}
                        >
                            {isImporting ? 'Импорт...' : 'Импорт'}
                        </button>
                        <button
                            type="button"
                            className={styles.headerButton}
                            onClick={() => void handleCreate()}
                        >
                            Новый проект
                        </button>
                        {visitedRooms.length > 0 && (
                            <button
                                type="button"
                                className={cn(
                                    styles.headerButton,
                                    showVisitedRooms && styles.headerButtonActive,
                                )}
                                onClick={() => setShowVisitedRooms(value => !value)}
                            >
                                Удалённые ({visitedRooms.length})
                            </button>
                        )}
                    </div>
                    {storageEstimate && (
                        <span className={styles.storageFree}>
                            {formatFreePercent(storageEstimate)} свободно
                        </span>
                    )}
                    <label className={styles.previewSizeControl} title="Размер миниатюр">
                        <input
                            type="range"
                            className={styles.previewSizeSlider}
                            min={PREVIEW_SIZE_MIN}
                            max={PREVIEW_SIZE_MAX}
                            value={previewSize}
                            onChange={event => setPreviewSize(Number(event.target.value))}
                        />
                    </label>
                    <button type="button" className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.modalBody}>
                <div className={styles.scrollBody}>
                    <div
                        className={styles.grid}
                        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(200, previewSize + 168)}px, 1fr))` }}
                    >
                        {showVisitedRooms
                            ? visitedRooms.map(room => {
                            const isCurrent = currentProjectKind === 'visited'
                                && room.localProjectId === currentProjectId

                            return (
                                <article
                                    key={room.hostProjectId}
                                    className={cn(
                                        styles.item,
                                        styles.itemVisited,
                                        isCurrent && styles.itemCurrent,
                                    )}
                                >
                                    <ProjectBoardsPreview
                                        boards={room.boards}
                                        figureCatalog={room.figureCatalog}
                                        projectPreviewDataUrl={room.previewDataUrl}
                                        maxSize={previewSize}
                                    />

                                    <div className={styles.itemBody}>
                                        <div className={styles.itemMain}>
                                            <button
                                                type="button"
                                                className={styles.nameButton}
                                                onClick={() => void handleOpenVisitedRoom(room.hostProjectId)}
                                            >
                                                {room.name}
                                                {isCurrent ? ' · текущий' : ''}
                                            </button>
                                            <div className={styles.metaRow}>
                                                <span className={styles.roomId}>{room.lastRoomId}</span>
                                                <span className={styles.updatedAt}>
                                                    {formatUpdatedAt(room.lastVisitedAt)}
                                                </span>
                                                <span className={styles.projectSize}>
                                                    {formatBoardCount(room.boards.length)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.actions}>
                                            <button
                                                type="button"
                                                onClick={() => void handleOpenVisitedRoom(room.hostProjectId)}
                                            >
                                                Открыть
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.promoteButton}
                                                onClick={() => void handlePromoteVisitedRoom(room.hostProjectId)}
                                            >
                                                В локальные
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            )
                        })
                            : projects.map(project => renderLocalProject(project))}
                    </div>
                </div>

                {statusMessage && (
                    <div className={styles.statusMessage}>{statusMessage}</div>
                )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={PROJECT_FILE_EXTENSION}
                    className={styles.hiddenInput}
                    onChange={handleFileInputChange}
                />
            </div>
        </div>
    )
}
