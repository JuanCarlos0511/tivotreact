import { useEffect, useState } from 'react'
import { KeyRound, Moon, Save, Sun } from 'lucide-react'
import type { ThemeMode } from '@/theme/theme'
import type { AiProviderName } from '@services/storage.service'
import { getAiRuntimeSettings, saveAiRuntimeSettings } from '@services/storage.service'

interface SettingsModalProps {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  onClose: () => void
}

export function SettingsModal({ theme, onThemeChange, onClose }: SettingsModalProps) {
  const [aiProvider, setAiProvider] = useState<AiProviderName>('mock')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const settings = getAiRuntimeSettings()
    if (!settings) return

    setAiProvider(settings.provider)
    setApiKey(settings.apiKey)
  }, [])

  const saveSettings = () => {
    saveAiRuntimeSettings({
      provider: aiProvider,
      apiKey,
    })
    onClose()
  }

  const shouldShowApiKey = aiProvider === 'gemini' || aiProvider === 'openai'

  return (
    <>
      <button className="modal-backdrop" aria-label="Cerrar configuracion" onClick={onClose} type="button" />
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-modal-header">
          <p className="settings-eyebrow" id="settings-title">
            Configuracion
          </p>
        </header>
        <div className="settings-row">
          <span className="settings-row-label">Tema del chat</span>
          <div className="theme-switch" aria-label="Tema del chat">
            <button
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              type="button"
              onClick={() => onThemeChange('dark')}
            >
              <Moon size={15} />
              <span>Oscuro</span>
            </button>
            <button
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              type="button"
              onClick={() => onThemeChange('light')}
            >
              <Sun size={15} />
              <span>Claro</span>
            </button>
          </div>
        </div>
        <div className="settings-row settings-row-stacked">
          <span className="settings-row-label">Motor IA</span>
          <div className="provider-switch" aria-label="Motor IA">
            {(['mock', 'ollama', 'gemini', 'openai'] as AiProviderName[]).map((provider) => (
              <button
                key={provider}
                className={`theme-option ${aiProvider === provider ? 'active' : ''}`}
                type="button"
                onClick={() => setAiProvider(provider)}
              >
                <span>{provider}</span>
              </button>
            ))}
          </div>
        </div>
        {shouldShowApiKey && (
          <label className="settings-field">
            <span className="settings-row-label">API key</span>
            <span className="settings-input-shell">
              <KeyRound size={15} />
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                placeholder="sk-..."
                autoComplete="off"
              />
            </span>
          </label>
        )}
        <button className="settings-save-button" type="button" onClick={saveSettings}>
          <Save size={15} />
          <span>Guardar</span>
        </button>
      </section>
    </>
  )
}
