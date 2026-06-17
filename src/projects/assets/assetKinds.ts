import { ProjectAssetView } from './types'

const FONT_EXTENSIONS = new Set(['woff', 'woff2', 'ttf', 'otf', 'eot'])
const MODEL_EXTENSIONS = new Set(['glb'])

const MODEL_MIME_TYPES = new Set([
    'model/gltf-binary',
    'application/octet-stream',
])

const FONT_MIME_TYPES = new Set([
    'font/woff',
    'font/woff2',
    'font/ttf',
    'font/otf',
    'font/sfnt',
    'application/font-woff',
    'application/font-woff2',
    'application/x-font-woff',
    'application/x-font-ttf',
    'application/x-font-opentype',
    'application/vnd.ms-fontobject',
])

export function getFileExtension(name: string): string {
    const parts = name.toLowerCase().split('.')
    return parts.length > 1 ? parts[parts.length - 1] : ''
}

export function isFontFile(file: Pick<File, 'name' | 'type'>): boolean {
    const extension = getFileExtension(file.name)

    if (!FONT_EXTENSIONS.has(extension)) {
        return false
    }

    if (file.type.startsWith('image/')) {
        return false
    }

    return file.type.startsWith('font/')
        || FONT_MIME_TYPES.has(file.type)
        || file.type === ''
        || file.type === 'application/octet-stream'
}

export function isFontAsset(asset: Pick<ProjectAssetView, 'mimeType' | 'name'>): boolean {
    if (FONT_EXTENSIONS.has(getFileExtension(asset.name))) {
        return true
    }

    return asset.mimeType.startsWith('font/')
        || FONT_MIME_TYPES.has(asset.mimeType)
}

export function isImageAsset(asset: Pick<ProjectAssetView, 'mimeType' | 'name'>): boolean {
    if (asset.mimeType.startsWith('image/')) {
        return true
    }

    const extension = getFileExtension(asset.name)

    return extension === 'svg'
        || extension === 'png'
        || extension === 'jpg'
        || extension === 'jpeg'
        || extension === 'gif'
        || extension === 'webp'
        || extension === 'bmp'
        || extension === 'ico'
}

export function isModelFile(file: Pick<File, 'name' | 'type'>): boolean {
    const extension = getFileExtension(file.name)

    if (!MODEL_EXTENSIONS.has(extension)) {
        return false
    }

    if (file.type.startsWith('image/') || file.type.startsWith('font/')) {
        return false
    }

    return file.type === ''
        || file.type === 'application/octet-stream'
        || MODEL_MIME_TYPES.has(file.type)
}

export function isModelAsset(asset: Pick<ProjectAssetView, 'mimeType' | 'name'>): boolean {
    if (MODEL_EXTENSIONS.has(getFileExtension(asset.name))) {
        return true
    }

    return asset.mimeType === 'model/gltf-binary'
}

export function isAllowedAssetFile(file: File): boolean {
    return file.type.startsWith('image/') || isFontFile(file) || isModelFile(file)
}

export function collectAllowedAssetFiles(files: Iterable<File>): File[] {
    const result: File[] = []

    for (const file of files) {
        if (isAllowedAssetFile(file)) {
            result.push(file)
        }
    }

    return result
}

export function collectAssetFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
    if (!dataTransfer) {
        return []
    }

    if (dataTransfer.files.length > 0) {
        return collectAllowedAssetFiles(dataTransfer.files)
    }

    const files: File[] = []

    for (const item of Array.from(dataTransfer.items)) {
        if (item.kind !== 'file') {
            continue
        }

        const file = item.getAsFile()
        if (file) {
            files.push(file)
        }
    }

    return collectAllowedAssetFiles(files)
}

export function collectAssetFilesFromClipboard(
    clipboardData: DataTransfer | null,
): File[] {
    if (!clipboardData) {
        return []
    }

    const fromItems: File[] = []

    for (const item of Array.from(clipboardData.items)) {
        if (item.kind !== 'file') {
            continue
        }

        const file = item.getAsFile()
        if (file) {
            fromItems.push(file)
        }
    }

    if (fromItems.length > 0) {
        return collectAllowedAssetFiles(fromItems)
    }

    return collectAllowedAssetFiles(clipboardData.files)
}

export function getFontFormat(asset: Pick<ProjectAssetView, 'name' | 'mimeType'>): string {
    const extension = getFileExtension(asset.name)

    switch (extension) {
        case 'woff':
            return 'woff'
        case 'woff2':
            return 'woff2'
        case 'otf':
            return 'opentype'
        case 'eot':
            return 'embedded-opentype'
        case 'ttf':
        default:
            return 'truetype'
    }
}

export const FONT_UPLOAD_ACCEPT = '.woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf'
export const IMAGE_UPLOAD_ACCEPT = 'image/*'
export const MODEL_UPLOAD_ACCEPT = '.glb,model/gltf-binary'
export const ASSET_UPLOAD_ACCEPT = `${IMAGE_UPLOAD_ACCEPT},${FONT_UPLOAD_ACCEPT},${MODEL_UPLOAD_ACCEPT}`
