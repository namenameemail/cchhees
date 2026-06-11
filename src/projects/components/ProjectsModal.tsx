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
        currentProjectId,
        createProject,
        renameProject,
        deleteProject,
        switchProject,
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

    const handleDelete = useCallback(async (id: string, name: string) => {
        if (!confirm(`Удалить проект «${name}»?`)) {
            return
        }

        await deleteProject(id)
        await refreshStorageInfo()
    }, [deleteProject, refreshStorageInfo])

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

                <div className={styles.list}>
                    {projects.map(project => {
                        const isCurrent = project.id === currentProjectId
                        const isRenaming = renamingId === project.id
                        const projectSize = projectSizes[project.id]

                        return (
                            <div
                                key={project.id}
                                className={`${styles.item} ${isCurrent ? styles.itemCurrent : ''}`}
                            >
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
                                            {isCurrent ? ' (текущий)' : ''}
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
                                                Переименовать
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleDelete(project.id, project.name)}
                                            >
                                                Удалить
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
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
        </div>
    )
}
