async function blobUrlToDataUrl(url: string): Promise<string> {
    const response = await fetch(url)
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

import { getFontFormat } from '../projects/assets/assetKinds'
import { getFontFamilyName } from '../projects/assets/useFontAssetFamily'

const FONT_FAMILY_STYLE_RE = /font-family:\s*([^;]+)/i
const FONT_FACE_URL_RE = /src:\s*url\(['"]?([^'")]+)['"]?\)\s*format\(['"]([^'"]+)['"]\)/

export interface ExportFontFaceSource {
    url: string
    format: string
    family: string
}

function collectFontAssetIds(svg: SVGSVGElement): Set<number> {
    const assetIds = new Set<number>()

    for (const text of svg.querySelectorAll('text')) {
        const style = text.getAttribute('style') ?? ''
        const match = style.match(FONT_FAMILY_STYLE_RE)

        if (!match) {
            continue
        }

        const family = match[1].trim().replace(/^['"]|['"]$/g, '')
        const prefix = 'cchhees-font-'

        if (!family.startsWith(prefix)) {
            continue
        }

        const assetId = Number(family.slice(prefix.length))

        if (Number.isFinite(assetId)) {
            assetIds.add(assetId)
        }
    }

    return assetIds
}

function resolveFontFaceSource(
    assetId: number,
    getFontFaceForAsset?: (assetId: number) => ExportFontFaceSource | undefined,
): ExportFontFaceSource | undefined {
    const fromContext = getFontFaceForAsset?.(assetId)

    if (fromContext) {
        return fromContext
    }

    const styleEl = document.getElementById(`cchhees-font-face-${assetId}`)
    const urlMatch = styleEl?.textContent?.match(FONT_FACE_URL_RE)

    if (!urlMatch) {
        return undefined
    }

    return {
        url: urlMatch[1],
        format: urlMatch[2],
        family: getFontFamilyName(assetId),
    }
}

async function inlineSvgFonts(
    svg: SVGSVGElement,
    getFontFaceForAsset?: (assetId: number) => ExportFontFaceSource | undefined,
): Promise<void> {
    const assetIds = collectFontAssetIds(svg)

    if (assetIds.size === 0) {
        return
    }

    const rules: string[] = []

    for (const assetId of assetIds) {
        const source = resolveFontFaceSource(assetId, getFontFaceForAsset)

        if (!source) {
            continue
        }

        const dataUrl = await blobUrlToDataUrl(source.url)
        rules.push(
            `@font-face { font-family: '${source.family}'; src: url('${dataUrl}') format('${source.format}'); }`,
        )
    }

    if (rules.length === 0) {
        return
    }

    let defs = svg.querySelector('defs')

    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        svg.insertBefore(defs, svg.firstChild)
    }

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.setAttribute('type', 'text/css')
    style.textContent = rules.join('\n')
    defs.insertBefore(style, defs.firstChild)
}

async function inlineSvgImages(svg: SVGSVGElement): Promise<void> {
    const images = svg.querySelectorAll('image')

    for (const image of images) {
        const href = image.getAttribute('href')
            || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href')

        if (!href || href.startsWith('data:')) {
            continue
        }

        const dataUrl = await blobUrlToDataUrl(href)
        image.setAttribute('href', dataUrl)
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl)
    }
}

function getSvgExportSize(svg: SVGSVGElement): { width: number; height: number } {
    const rect = svg.getBoundingClientRect()
    const width = rect.width || Number(svg.getAttribute('width')) || 1
    const height = rect.height || Number(svg.getAttribute('height')) || 1

    return { width, height }
}

export interface ExportBoardImageOptions {
    filename: string
    background?: string
    scale?: number
    getFontFaceForAsset?: (assetId: number) => ExportFontFaceSource | undefined
}

export async function exportBoardAsPng(
    svg: SVGSVGElement,
    options: ExportBoardImageOptions,
): Promise<void> {
    const { filename, background = '#ffffff', scale = 2, getFontFaceForAsset } = options
    const { width, height } = getSvgExportSize(svg)

    const clone = svg.cloneNode(true) as SVGSVGElement

    clone.querySelectorAll('[data-board-handler]').forEach(element => element.remove())
    clone.querySelectorAll('radialGradient').forEach(element => element.remove())

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))

    await inlineSvgFonts(clone, getFontFaceForAsset)
    await inlineSvgImages(clone)

    const svgString = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const objectUrl = URL.createObjectURL(svgBlob)

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = () => reject(new Error('Failed to render board SVG'))
            img.src = objectUrl
        })

        if (typeof image.decode === 'function') {
            await image.decode()
        }

        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))

        const context = canvas.getContext('2d')
        if (!context) {
            throw new Error('Canvas is not available')
        }

        context.fillStyle = background
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        const pngUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = filename.endsWith('.png') ? filename : `${filename}.png`
        link.href = pngUrl
        link.click()
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}

export function createBoardImageFilename(projectName: string): string {
    const safeName = projectName.trim().replace(/[^\w\u0400-\u04FF.-]+/g, '_') || 'board'
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `${safeName}-${stamp}.png`
}
