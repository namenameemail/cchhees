import React from 'react'
import ReactDOM from 'react-dom/client'
import { mountIsolatedDebugPanel } from 'vite-dev-profiler/react'
import 'vite-dev-profiler/react/style.css'
import App from './App'
import { ComponentsCatalogPage } from './showcase/ComponentsCatalogPage'
import { isShowcaseRoute } from './showcase/route'
import { profiler } from './profiler'
import './index.css'
import 'bbuutoonnss/dist/bbuutoonnss.css'
import { projectsBootstrapLog } from './projects/projectsBootstrapLog'

console.log('[cchhees] main.tsx — загрузка приложения')
projectsBootstrapLog.moduleLoaded()

if (import.meta.env.DEV) {
    mountIsolatedDebugPanel({ profiler })
}

const Root = isShowcaseRoute(window.location.pathname)
    ? ComponentsCatalogPage
    : App

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
