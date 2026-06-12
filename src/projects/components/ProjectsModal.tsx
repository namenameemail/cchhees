import React, {
    DragEvent,
    FC,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import { useProjectContext } from '../ProjectContext'
import { formatMegabytes } from '../formatBytes'
import { isProjectImportFile } from '../projectFile'
import { getProjectByteSize, readStorageEstimate, StorageEstimate } from '../storageEstimate'
import { ConfirmModal } from '../../components/ConfirmModal'
import { getBoardPreviewBoxStyle } from '../boardPreviewSize'
import { getActiveBoardGameState } from '../types'
import { visitedRoomToProject } from '../visitedRooms/types'
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
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
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

    const handleDeleteClick = useCallback((id: string, name: string) => {
        setPendingDelete({ id, name })
    }, [])

    const handleConfirmDelete = useCallback(async () => {
        if (!pendingDelete) {
            return
        }

        const { id } = pendingDelete
        setPendingDelete(null)
        await deleteProject(id)
        await refreshStorageInfo()
    }, [pendingDelete, deleteProject, refreshStorageInfo])

    const handleCancelDelete = useCallback(() => {
        setPendingDelete(null)
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
            setStatusMessage('Перетащите файл проекта (.cchhees.json или .json)')
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
                        Отпустите файл проекта для импорта
                    </div>
                )}

                <div className={styles.header}>
                    <div className={styles.headerMain}>
                        <h2 className={styles.title}>Проекты</h2>
                        {storageEstimate && (
                            <div className={styles.storageInfo}>
                                <span>
                                    Хранилище: {formatMegabytes(storageEstimate.usage)}
                                    {' / '}
                                    {formatMegabytes(storageEstimate.quota)}
                                </span>
                                <span className={styles.storageFree}>
                                    Свободно {formatFreePercent(storageEstimate)}
                                </span>
                            </div>
                        )}
                    </div>
                    <button type="button" className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.scrollBody}>
                    {visitedRooms.length > 0 && (
                        <section className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                Collab-проекты
                                <span className={styles.sectionHint}>до 10, по UUID хоста</span>
                            </h3>
                            <div className={styles.grid}>
                                {visitedRooms.map(room => {
                                    const isCurrent = currentProjectKind === 'visited'
                                        && room.localProjectId === currentProjectId
                                    const previewBox = getBoardPreviewBoxStyle(
                                        getActiveBoardGameState(visitedRoomToProject(room)).boardParameters,
                                        56,
                                    )

                                    return (
                                        <article
                                            key={room.hostProjectId}
                                            className={`${styles.item} ${styles.itemVisited} ${isCurrent ? styles.itemCurrent : ''}`}
                                        >
                                            <div
                                                className={styles.preview}
                                                style={{
                                                    width: previewBox.width,
                                                    height: previewBox.height,
                                                }}
                                                aria-hidden
                                            >
                                                {room.previewDataUrl ? (
                                                    <img
                                                        className={styles.previewImage}
                                                        src={room.previewDataUrl}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span className={styles.previewPlaceholder}>?</span>
                                                )}
                                            </div>

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
                                })}
                            </div>
                        </section>
                    )}

                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Локальные проекты</h3>
                        <div className={styles.grid}>
                    {projects.map(project => {
                        const isCurrent = currentProjectKind === 'local' && project.id === currentProjectId
                        const isRenaming = renamingId === project.id
                        const projectSize = projectSizes[project.id]
                        const previewBox = getBoardPreviewBoxStyle(getActiveBoardGameState(project).boardParameters, 56)

                        return (
                            <article
                                key={project.id}
                                className={`${styles.item} ${isCurrent ? styles.itemCurrent : ''}`}
                            >
                                <div
                                    className={styles.preview}
                                    style={{
                                        width: previewBox.width,
                                        height: previewBox.height,
                                    }}
                                    aria-hidden
                                >
                                    {project.previewDataUrl ? (
                                        <img
                                            className={styles.previewImage}
                                            src={project.previewDataUrl}
                                            alt=""
                                        />
                                    ) : (
                                        <span className={styles.previewPlaceholder}>?</span>
                                    )}
                                </div>

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
                                                <button
                                                    type="button"
                                                    className={styles.deleteButton}
                                                    onClick={() => handleDeleteClick(project.id, project.name)}
                                                >
                                                    Удалить
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                        </div>
                    </section>
                </div>

                {statusMessage && (
                    <div className={styles.statusMessage}>{statusMessage}</div>
                )}

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.importButton}
                        onClick={handleImportClick}
                        disabled={isImporting}
                    >
                        {isImporting ? 'Импорт...' : 'Импорт из файла'}
                    </button>
                    <button type="button" className={styles.createButton} onClick={() => void handleCreate()}>
                        Новый проект
                    </button>
                    <p className={styles.dropHint}>
                        Или перетащите файл проекта (.cchhees.json) в это окно
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.cchhees.json,application/json"
                    className={styles.hiddenInput}
                    onChange={handleFileInputChange}
                />
            </div>

            <ConfirmModal
                open={pendingDelete !== null}
                title="Удалить проект"
                message={pendingDelete ? `Удалить проект «${pendingDelete.name}»? Это действие нельзя отменить.` : ''}
                confirmLabel="Удалить"
                destructive
                onConfirm={() => void handleConfirmDelete()}
                onCancel={handleCancelDelete}
            />
        </div>
    )
}
