import React, { FC } from 'react'

interface SubjectRoleIconProps {
    size: number
}

export const MovedSubjectIcon: FC<SubjectRoleIconProps> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="12" r="5" fill="#555" />
        <path
            d="M14 12h6m0 0-2.5-2.5M20 12l-2.5 2.5"
            stroke="#2f6fbe"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </svg>
)

export const SteppedOnSubjectIcon: FC<SubjectRoleIconProps> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="14" r="5" fill="#555" />
        <path
            d="M12 3v5m0 0-2-2m2 2 2-2"
            stroke="#b45309"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </svg>
)

export const HoppedOverSubjectIcon: FC<SubjectRoleIconProps> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="7" cy="16" r="4" fill="#555" />
        <path
            d="M11 12c3-4 8-4 11 0"
            stroke="#0ff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
        />
        <circle cx="20" cy="12" r="3" fill="#555" opacity="0.35" />
    </svg>
)

export const NearbySubjectIcon: FC<SubjectRoleIconProps> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx="12" cy="12" r="3" fill="#555" />
        <circle cx="17" cy="8" r="2" fill="#2f6fbe" />
    </svg>
)
