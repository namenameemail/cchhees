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
