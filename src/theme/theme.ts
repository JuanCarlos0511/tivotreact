export type ThemeMode = 'light' | 'dark'

const themeStorageKey = 'tivot-theme'

export const getInitialTheme = (): ThemeMode => {
  const storedTheme = window.localStorage.getItem(themeStorageKey)
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return 'dark'
}

export const applyTheme = (theme: ThemeMode): void => {
  document.documentElement.dataset.theme = theme
  window.localStorage.setItem(themeStorageKey, theme)
}

export const toggleTheme = (theme: ThemeMode): ThemeMode => theme === 'light' ? 'dark' : 'light'
