import React, { FC, useCallback, useEffect, useState } from 'react'
import cn from 'classnames'
import { useCollab } from '../CollabProvider'
import { useProjectContext } from '../../projects/ProjectContext'
import { collabError, formatCollabError } from '../debug'
import styles from './CollabPanel.module.css'

export interface CollabPanelProps {
    layout?: 'bar' | 'panel'
}

export const CollabPanel: FC<CollabPanelProps> = ({ layout = 'bar' }) => {
    const { currentProject, switchProjectSession } = useProjectContext()
    const {
        status,
        roomId,
        peerCount,
        error,
        hostSnapshotProgress,
        joinProgress,
        collabSessionTarget,
        isViewingCollabTarget,
        joinRoomAndImport,
        startHosting,
        leaveSession,
    } = useCollab()

    const [isBusy, setIsBusy] = useState(false)
    const [isJoiningRoom, setIsJoiningRoom] = useState(false)
    const [roomIdInput, setRoomIdInput] = useState('')
    const [joinError, setJoinError] = useState<string | null>(null)
    const [copyMessage, setCopyMessage] = useState<string | null>(null)

    const isActive = status === 'hosting' || status === 'connected' || status === 'connecting'

    useEffect(() => {
        const roomFromUrl = new URLSearchParams(window.location.search).get('room')

        if (roomFromUrl) {
            setRoomIdInput(roomFromUrl.toUpperCase())
        }
    }, [])

    const handleStartHosting = useCallback(async () => {
        setIsBusy(true)

        try {
            await startHosting()
        } catch (hostError) {
            console.error('[CollabPanel] startHosting failed:', hostError)
        } finally {
            setIsBusy(false)
        }
    }, [startHosting])

    const handleJoinRoom = useCallback(async () => {
        const trimmed = roomIdInput.trim()

        if (!trimmed) {
            setJoinError('Введите ID комнаты')
            return
        }

        setIsJoiningRoom(true)
        setJoinError(null)

        try {
            await joinRoomAndImport(trimmed)
        } catch (joinRoomError) {
            collabError('[CollabPanel] join room failed:', formatCollabError(joinRoomError), joinRoomError)
            setJoinError(formatCollabError(joinRoomError) || 'Не удалось подключиться к комнате')
        } finally {
            setIsJoiningRoom(false)
        }
    }, [joinRoomAndImport, roomIdInput])

    const handleCopyRoomId = useCallback(async () => {
        if (!roomId) {
            return
        }

        try {
            await navigator.clipboard.writeText(roomId)
            setCopyMessage('Скопировано')
            window.setTimeout(() => setCopyMessage(null), 1500)
        } catch {
            setCopyMessage('Ошибка копирования')
        }
    }, [roomId])

    const handleLeave = useCallback(() => {
        leaveSession()
    }, [leaveSession])

    const handleOpenSessionProject = useCallback(async () => {
        if (!collabSessionTarget || isViewingCollabTarget) {
            return
        }

        await switchProjectSession(
            collabSessionTarget.projectId,
            collabSessionTarget.projectKind,
        )
    }, [collabSessionTarget, isViewingCollabTarget, switchProjectSession])

    const statusLabel = (() => {
        if (hostSnapshotProgress.active && hostSnapshotProgress.phase !== 'idle') {
            const parts = [hostSnapshotProgress.label]

            if (hostSnapshotProgress.detail) {
                parts.push(hostSnapshotProgress.detail)
            }

            return parts.join(' · ')
        }

        if (status === 'connecting') {
            return 'Подключение...'
        }

        if (status === 'hosting' && peerCount === 0) {
            return 'Ожидание'
        }

        if (status === 'hosting' || status === 'connected') {
            return `${peerCount + 1} участн.`
        }

        if (status === 'error') {
            return 'Ошибка'
        }

        return null
    })()

    const showJoinControls = !isActive && !joinProgress.active
    const showOpenRoom = showJoinControls && Boolean(currentProject)

    return (
        <div className={cn(styles.collabPanel, layout === 'panel' && styles.collabPanelLayoutPanel)}>
            {(error || joinError) && (
                <span className={styles.error} title={error ?? joinError ?? undefined}>
                    {error ?? joinError}
                </span>
            )}

            {joinProgress.active && (
                <span
                    className={styles.joinStatus}
                    title={joinProgress.detail ?? undefined}
                    role="status"
                    aria-live="polite"
                >
                    {joinProgress.label}
                    {joinProgress.detail ? ` · ${joinProgress.detail}` : ''}
                    {' '}
                    {Math.round(joinProgress.percent)}%
                </span>
            )}

            {showJoinControls && (
                <div className={styles.joinRow}>
                    <input
                        id="collab-room-id"
                        className={styles.joinInput}
                        value={roomIdInput}
                        onChange={event => setRoomIdInput(event.target.value.toUpperCase())}
                        placeholder="ID комнаты"
                        disabled={isJoiningRoom}
                        aria-label="ID комнаты"
                    />
                    <button
                        type="button"
                        className={styles.collabButton}
                        onClick={() => void handleJoinRoom()}
                        disabled={isJoiningRoom}
                    >
                        {isJoiningRoom ? '…' : 'Подключиться'}
                    </button>
                </div>
            )}

            {showOpenRoom && (
                <button
                    type="button"
                    className={styles.collabButton}
                    onClick={() => void handleStartHosting()}
                    disabled={isBusy}
                >
                    {isBusy ? 'Открытие...' : 'Открыть комнату'}
                </button>
            )}

            {isActive && (
                <>
                    <div className={styles.roomInfo}>
                        {!isViewingCollabTarget && collabSessionTarget && (
                            <button
                                type="button"
                                className={styles.sessionProjectName}
                                title={`Открыть «${collabSessionTarget.projectName}»`}
                                onClick={() => void handleOpenSessionProject()}
                            >
                                {collabSessionTarget.projectName}
                            </button>
                        )}
                        <span className={styles.roomId}>{roomId}</span>
                        {statusLabel && (
                            <span
                                className={
                                    hostSnapshotProgress.active
                                        ? styles.snapshotStatus
                                        : styles.status
                                }
                                title={statusLabel}
                            >
                                {statusLabel}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className={styles.collabButton}
                        onClick={() => void handleCopyRoomId()}
                    >
                        {copyMessage ?? 'Copy'}
                    </button>
                    <button
                        type="button"
                        className={styles.collabButton}
                        onClick={handleLeave}
                    >
                        Закрыть
                    </button>
                </>
            )}
        </div>
    )
}
