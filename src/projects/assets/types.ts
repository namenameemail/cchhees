export interface ProjectAssetRecord {
    id: number
    projectId: string
    name: string
    mimeType: string
    blob: Blob
    size: number
    createdAt: number
}

export interface ProjectAssetNewRecord {
    projectId: string
    name: string
    mimeType: string
    blob: Blob
    size: number
}

export interface ProjectAssetView {
    id: number
    name: string
    mimeType: string
    size: number
    objectUrl: string
}
