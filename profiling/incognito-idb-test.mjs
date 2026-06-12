import { chromium } from 'playwright'

const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

page.on('console', msg => {
    console.log(`[page ${msg.type()}]`, msg.text())
})

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })

const result = await page.evaluate(async () => {
    const errors = []

    async function probe(label, fn) {
        try {
            return await fn()
        } catch (error) {
            errors.push({
                label,
                name: error?.name,
                message: error?.message,
                string: String(error),
                json: JSON.stringify(error),
            })
            return null
        }
    }

    const idbOpen = await probe('openDB', async () => {
        const request = indexedDB.open('cchhees-probe', 1)
        const db = await new Promise((resolve, reject) => {
            request.onupgradeneeded = () => {
                request.result.createObjectStore('probe')
            }
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })

        await new Promise((resolve, reject) => {
            const tx = db.transaction('probe', 'readwrite')
            tx.objectStore('probe').put({ ok: true }, 'x')
            tx.oncomplete = () => resolve(undefined)
            tx.onerror = () => reject(tx.error)
        })

        db.close()
        indexedDB.deleteDatabase('cchhees-probe')
        return true
    })

    const blobPut = await probe('blobPut', async () => {
        const request = indexedDB.open('cchhees-probe-blob', 1)
        const db = await new Promise((resolve, reject) => {
            request.onupgradeneeded = () => {
                request.result.createObjectStore('assets', { keyPath: 'id', autoIncrement: true })
            }
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })

        const fontBytes = new Uint8Array(120_000)
        fontBytes.fill(65)
        const blob = new Blob([fontBytes], { type: 'font/ttf' })

        await new Promise((resolve, reject) => {
            const tx = db.transaction('assets', 'readwrite')
            tx.objectStore('assets').add({
                projectId: 'test',
                name: 'big.ttf',
                mimeType: 'font/ttf',
                blob,
                size: blob.size,
                createdAt: Date.now(),
            })
            tx.oncomplete = () => resolve(undefined)
            tx.onerror = () => reject(tx.error)
        })

        db.close()
        indexedDB.deleteDatabase('cchhees-probe-blob')
        return true
    })

    const atobProbe = await probe('atob', async () => {
        let binary = ''
        const bytes = new Uint8Array(120_000)
        bytes.fill(65)
        for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        atob(base64)
        return base64.length
    })

    return { idbOpen, blobPut, atobProbe, errors }
})

console.log('probe result:', JSON.stringify(result, null, 2))
await browser.close()
