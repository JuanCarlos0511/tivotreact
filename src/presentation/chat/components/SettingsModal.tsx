import { Moon, Sun } from 'lucide-react'
import type { ThemeMode } from '@/theme/theme'

interface SettingsModalProps {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  onClose: () => void
}

export function SettingsModal({ theme, onThemeChange, onClose }: SettingsModalProps) {
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
      </section>
    </>
  )
}
