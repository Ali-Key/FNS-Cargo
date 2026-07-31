import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './index.css'

// Resolve the mount node defensively. If the host page ever serves a shell
// without #root, create one rather than throwing on a null element.
function getRootElement(): HTMLElement {
  const existing = document.getElementById('root')
  if (existing) return existing

  const created = document.createElement('div')
  created.id = 'root'
  document.body.appendChild(created)
  return created
}

createRoot(getRootElement()).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
