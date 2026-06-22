import React, { FC, useMemo, useState } from 'react'
import { ColorAutocompleteInput } from '../../components/colors/ColorAutocompleteInput'
import { ImageSelect } from '../../components/ImageSelect/ImageSelect'
import { DemoCard } from '../DemoCard'

export const ColorAutocompleteDemo: FC = () => {
    const [value, setValue] = useState('#336699')

    return (
        <DemoCard
            title="ColorAutocompleteInput"
            usedIn="цветовые поля Form1 (ColorInput)"
            state={{ value }}
        >
            <ColorAutocompleteInput
                value={value}
                onChange={setValue}
                placeholder="color"
            />
        </DemoCard>
    )
}

export const ImageSelectDemo: FC = () => {
    const [value, setValue] = useState<number | null>(1)

    const assets = useMemo(() => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#ccc"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#333">A</text></svg>'
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)

        return [{
            id: 1,
            name: 'mock.svg',
            mimeType: 'image/svg+xml',
            size: blob.size,
            objectUrl: url,
        }]
    }, [])

    return (
        <DemoCard
            title="ImageSelect"
            usedIn="выбор ассета (ProjectImageSelect оборачивает с AssetsContext)"
            state={{ value }}
        >
            <ImageSelect
                value={value}
                assets={assets}
                clearable
                placeholder="asset"
                onChange={setValue}
            />
        </DemoCard>
    )
}
