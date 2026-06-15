import { getFontFormat } from '../projects/assets/assetKinds'
import { getFontFamilyName } from '../projects/assets/useFontAssetFamily'
import { exportDebugLog } from './exportDebugLog'

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

function getBoardBorderRadiusFromSvg(svg: SVGSVGElement): number {
    const outerClipRect = svg.querySelector('defs clipPath[data-export-clip="outer"] rect[rx]')
    const clipRect = outerClipRect ?? svg.querySelector('defs clipPath rect[rx]')
    const rx = clipRect?.getAttribute('rx')

    if (!rx) {
        return 0
    }

    const value = Number(rx)
    return Number.isFinite(value) && value > 0 ? value : 0
}

function summarizeSvgForExportDebug(svg: SVGSVGElement): Record<string, unknown> {
    const clipPaths = [...svg.querySelectorAll('defs clipPath rect[rx]')].map(rect => ({
        exportClip: rect.parentElement?.getAttribute('data-export-clip') ?? null,
        width: rect.getAttribute('width'),
        height: rect.getAttribute('height'),
        rx: rect.getAttribute('rx'),
    }))

    const topRects = [...svg.querySelectorAll(':scope > rect, :scope > g > rect')]
        .slice(0, 6)
        .map(rect => ({
            fill: rect.getAttribute('fill'),
            x: rect.getAttribute('x'),
            y: rect.getAttribute('y'),
            width: rect.getAttribute('width'),
            height: rect.getAttribute('height'),
        }))

    return {
        clipPaths,
        topRectCount: topRects.length,
        topRects,
        svgWidth: svg.getAttribute('width'),
        svgHeight: svg.getAttribute('height'),
    }
}

function shouldFillCanvasBackground(background: string): boolean {
    return background !== 'transparent'
}

export interface ExportBoardImageOptions {
    background?: string
    borderRadius?: number
    scale?: number
    maxWidth?: number
    mimeType?: 'image/png' | 'image/jpeg'
    quality?: number
    getFontFaceForAsset?: (assetId: number) => ExportFontFaceSource | undefined
}

export interface ExportBoardDownloadOptions extends ExportBoardImageOptions {
    filename: string
}

function resolveCanvasSize(
    width: number,
    height: number,
    scale: number,
    maxWidth?: number,
): { canvasWidth: number; canvasHeight: number; drawScale: number } {
    let drawScale = scale

    if (maxWidth && width * drawScale > maxWidth) {
        drawScale = maxWidth / width
    }

    return {
        canvasWidth: Math.max(1, Math.round(width * drawScale)),
        canvasHeight: Math.max(1, Math.round(height * drawScale)),
        drawScale,
    }
}

function clipCanvasToRoundedRect(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    radius: number,
): void {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2))

    if (r === 0) {
        return
    }

    context.beginPath()

    if (typeof context.roundRect === 'function') {
        context.roundRect(0, 0, width, height, r)
    } else {
        context.moveTo(r, 0)
        context.lineTo(width - r, 0)
        context.quadraticCurveTo(width, 0, width, r)
        context.lineTo(width, height - r)
        context.quadraticCurveTo(width, height, width - r, height)
        context.lineTo(r, height)
        context.quadraticCurveTo(0, height, 0, height - r)
        context.lineTo(0, r)
        context.quadraticCurveTo(0, 0, r, 0)
        context.closePath()
    }

    context.clip()
}

export async function renderBoardImageDataUrl(
    svg: SVGSVGElement,
    options: ExportBoardImageOptions = {},
): Promise<string> {
    const {
        background = '#ffffff',
        scale = 2,
        maxWidth,
        mimeType = 'image/png',
        quality = 0.85,
        getFontFaceForAsset,
    } = options
    const { width, height } = getSvgExportSize(svg)

    exportDebugLog.start({ mimeType, scale, maxWidth, width, height })

    const clone = svg.cloneNode(true) as SVGSVGElement

    clone.querySelectorAll('[data-board-handler]').forEach(element => element.remove())
    clone.querySelectorAll('[data-board-mark="cursor"]').forEach(element => element.remove())

    const borderRadius = options.borderRadius ?? getBoardBorderRadiusFromSvg(clone)
    const shouldFill = shouldFillCanvasBackground(background)

    exportDebugLog.params({
        resolvedBorderRadius: borderRadius,
        canvasBackground: background,
        shouldFill,
        borderRadiusFromOptions: options.borderRadius ?? null,
        borderRadiusFromSvg: options.borderRadius == null ? getBoardBorderRadiusFromSvg(clone) : null,
    })

    exportDebugLog.svgSummary(summarizeSvgForExportDebug(clone))

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

        const { canvasWidth, canvasHeight, drawScale } = resolveCanvasSize(width, height, scale, maxWidth)

        const canvas = document.createElement('canvas')
        canvas.width = canvasWidth
        canvas.height = canvasHeight

        const context = canvas.getContext('2d')
        if (!context) {
            throw new Error('Canvas is not available')
        }

        context.clearRect(0, 0, canvas.width, canvas.height)

        if (shouldFill) {
            context.fillStyle = background
            context.fillRect(0, 0, canvas.width, canvas.height)
        }

        if (borderRadius > 0) {
            clipCanvasToRoundedRect(
                context,
                canvas.width,
                canvas.height,
                borderRadius * drawScale,
            )
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        const dataUrl = mimeType === 'image/jpeg'
            ? canvas.toDataURL('image/jpeg', quality)
            : canvas.toDataURL('image/png')

        exportDebugLog.done({ canvasWidth, canvasHeight, drawScale })

        return dataUrl
    } catch (error) {
        exportDebugLog.error(error instanceof Error ? error.message : String(error))
        throw error
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}

export async function exportBoardAsPng(
    svg: SVGSVGElement,
    options: ExportBoardDownloadOptions,
): Promise<void> {
    const { filename, ...renderOptions } = options
    const pngUrl = await renderBoardImageDataUrl(svg, {
        ...renderOptions,
        mimeType: 'image/png',
    })
    const link = document.createElement('a')
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`
    link.href = pngUrl
    link.click()
}

export function createBoardImageFilename(projectName: string): string {
    const safeName = projectName.trim().replace(/[^\w\u0400-\u04FF.-]+/g, '_') || 'board'
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `${safeName}-${stamp}.png`
}
