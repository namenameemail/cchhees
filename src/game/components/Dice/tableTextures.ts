import { CanvasTexture, RepeatWrapping } from 'three'

function lcg(seed: number) {
    let s = seed | 0
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) | 0
        return (s >>> 0) / 4294967296
    }
}

export function createFeltTexture(): CanvasTexture {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const r = lcg(42)

    // Base colour
    ctx.fillStyle = '#1c6830'
    ctx.fillRect(0, 0, size, size)

    // Subtle large-scale tone variation (lighter patches)
    for (let i = 0; i < 12; i++) {
        const x = r() * size
        const y = r() * size
        const rad = r() * 120 + 60
        const grd = ctx.createRadialGradient(x, y, 0, x, y, rad)
        grd.addColorStop(0, 'rgba(255,255,255,0.04)')
        grd.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, size, size)
    }

    // Short directional fibers (felt nap — slightly biased toward 45°)
    for (let i = 0; i < 90000; i++) {
        const x = r() * size
        const y = r() * size
        const len = r() * 4 + 0.5
        const angle = (r() - 0.5) * 1.2 + Math.PI * 0.25
        const d = (r() - 0.5) * 55
        const rr = Math.max(0, Math.min(255, 28 + d)) | 0
        const gg = Math.max(0, Math.min(255, 104 + d)) | 0
        const bb = Math.max(0, Math.min(255, 48 + d)) | 0
        ctx.strokeStyle = `rgb(${rr},${gg},${bb})`
        ctx.lineWidth = r() * 0.6 + 0.2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
        ctx.stroke()
    }

    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(6, 6)
    return tex
}

export function createWoodTexture(): CanvasTexture {
    const w = 512
    const h = 256
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    const r = lcg(777)

    // Base gradient — slight colour banding along the grain
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0.00, '#6B3A1A')
    grad.addColorStop(0.20, '#7C4820')
    grad.addColorStop(0.45, '#693818')
    grad.addColorStop(0.65, '#7D4922')
    grad.addColorStop(0.85, '#6A3919')
    grad.addColorStop(1.00, '#7B4820')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Broad grain — dark wavy lines
    for (let i = 0; i < 40; i++) {
        const y = r() * h
        const alpha = r() * 0.35 + 0.05
        ctx.strokeStyle = `rgba(18,6,0,${alpha})`
        ctx.lineWidth = r() * 2.5 + 0.3
        ctx.beginPath()
        ctx.moveTo(0, y)
        for (let x = 0; x <= w; x += 6) {
            ctx.lineTo(x, y + Math.sin(x * 0.02 + r() * 6) * 9 + (r() - 0.5) * 3)
        }
        ctx.stroke()
    }

    // Fine grain — light shimmer lines
    for (let i = 0; i < 30; i++) {
        const y = r() * h
        const alpha = r() * 0.12 + 0.02
        ctx.strokeStyle = `rgba(210,145,65,${alpha})`
        ctx.lineWidth = r() * 0.7 + 0.2
        ctx.beginPath()
        ctx.moveTo(0, y)
        for (let x = 0; x <= w; x += 6) {
            ctx.lineTo(x, y + Math.sin(x * 0.014 + r() * 5) * 6)
        }
        ctx.stroke()
    }

    // Occasional subtle knot
    for (let i = 0; i < 2; i++) {
        const kx = r() * w
        const ky = r() * h
        const grd = ctx.createRadialGradient(kx, ky, 0, kx, ky, 18)
        grd.addColorStop(0, 'rgba(30,10,0,0.5)')
        grd.addColorStop(0.5, 'rgba(30,10,0,0.15)')
        grd.addColorStop(1, 'rgba(30,10,0,0)')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, w, h)
    }

    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(3, 1)
    return tex
}
