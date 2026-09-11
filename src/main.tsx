import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { TelemetryProvider } from '@features/telemetry/context/TelemetryContext'
import '@features/telemetry/components/telemetry.css'
import { applyTheme, getInitialTheme } from './theme/theme'

applyTheme(getInitialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelemetryProvider>
      <App />
    </TelemetryProvider>
  </StrictMode>,
)
