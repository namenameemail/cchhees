import { ProjectAssetView } from './types'

const FONT_EXTENSIONS = new Set(['woff', 'woff2', 'ttf', 'otf', 'eot'])

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
    return asset.mimeType.startsWith('image/')
        || asset.name.toLowerCase().endsWith('.svg')
}

export function isAllowedAssetFile(file: File): boolean {
    return file.type.startsWith('image/') || isFontFile(file)
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
