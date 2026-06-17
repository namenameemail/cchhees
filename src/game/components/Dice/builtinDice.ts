import {
    BoxGeometry,
    CanvasTexture,
    MeshStandardMaterial,
    SRGBColorSpace,
} from 'three'

const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
    1: [[0.5, 0.5]],
    2: [[0.3, 0.3], [0.7, 0.7]],
    3: [[0.3, 0.3], [0.5, 0.5], [0.7, 0.7]],
    4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
    5: [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
    6: [[0.3, 0.25], [0.7, 0.25], [0.3, 0.5], [0.7, 0.5], [0.3, 0.75], [0.7, 0.75]],
}

function createPipTexture(value: number): CanvasTexture {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('Canvas 2D context unavailable')
    }

    ctx.fillStyle = '#f4efe6'
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = '#171717'
    const pipRadius = size * 0.08
    const pips = PIP_LAYOUTS[value]

    for (const [x, y] of pips) {
        ctx.beginPath()
        ctx.arc(x * size, y * size, pipRadius, 0, Math.PI * 2)
        ctx.fill()
    }

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
}

export function createBuiltinDiceGeometry(): BoxGeometry {
    return new BoxGeometry(1, 1, 1)
}

export function createBuiltinDiceMaterials(): MeshStandardMaterial[] {
    const faceValues = [3, 4, 1, 6, 2, 5]

    return faceValues.map(value => {
        const texture = createPipTexture(value)
        return new MeshStandardMaterial({
            map: texture,
            roughness: 0.55,
            metalness: 0.05,
        })
    })
}

export function disposeBuiltinDiceMaterials(materials: MeshStandardMaterial[]): void {
    for (const material of materials) {
        material.map?.dispose()
        material.dispose()
    }
}
