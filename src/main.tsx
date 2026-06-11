import React from 'react'
import ReactDOM from 'react-dom/client'
import { mountIsolatedDebugPanel } from 'vite-dev-profiler/react'
import 'vite-dev-profiler/react/style.css'
import App from './App'
import { profiler } from './profiler'
import './index.css'

if (import.meta.env.DEV) {
    mountIsolatedDebugPanel({ profiler })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
