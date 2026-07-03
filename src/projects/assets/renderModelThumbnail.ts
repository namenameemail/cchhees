import {
    AmbientLight,
    Box3,
    DirectionalLight,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer,
} from 'three'
import { GLTFLoader, type GLTF } from 'three-stdlib'

const THUMBNAIL_SIZE = 128

async function generate(url: string): Promise<string> {
    const canvas = document.createElement('canvas')
    canvas.width = THUMBNAIL_SIZE
    canvas.height = THUMBNAIL_SIZE
    canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;pointer-events:none'
    document.body.appendChild(canvas)

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(THUMBNAIL_SIZE, THUMBNAIL_SIZE)
    renderer.setPixelRatio(1)
    renderer.setClearColor(0x888888, 1)

    try {
        const scene = new Scene()
        const camera = new PerspectiveCamera(45, 1, 0.01, 1000)

        scene.add(new AmbientLight(0xffffff, 2.7))

        const keyLight = new DirectionalLight(0xffffff, 7.5)
        keyLight.position.set(5, 8, 4)
        scene.add(keyLight)

        const loader = new GLTFLoader()
        const gltf = await new Promise<GLTF>((resolve, reject) =>
            loader.load(url, resolve, undefined, reject),
        )

        scene.add(gltf.scene)

        const box = new Box3().setFromObject(gltf.scene)
        const center = box.getCenter(new Vector3())
        const size = box.getSize(new Vector3())
        const maxDim = Math.max(size.x, size.y, size.z, 0.001)

        gltf.scene.position.sub(center)

        const dist = maxDim * 1.8
        camera.position.set(dist, dist * 0.5, dist)
        camera.lookAt(0, 0, 0)

        renderer.render(scene, camera)
        return canvas.toDataURL('image/jpeg', 0.85)
    } finally {
        renderer.dispose()
        document.body.removeChild(canvas)
    }
}

const cache = new Map<string, Promise<string>>()

export function getModelThumbnail(objectUrl: string): Promise<string> {
    if (!cache.has(objectUrl)) {
        const promise = generate(objectUrl).catch(err => {
            cache.delete(objectUrl)
            console.error('[thumbnail] failed:', err)
            throw err
        })
        cache.set(objectUrl, promise)
    }
    return cache.get(objectUrl)!
}
