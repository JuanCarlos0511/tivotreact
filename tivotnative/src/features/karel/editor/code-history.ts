export interface CodeHistory {
  code: string
  past: string[]
  future: string[]
}
export type CodeHistoryAction = { type: 'change'; code: string } | { type: 'undo' } | { type: 'redo' }
export const createCodeHistory = (code: string): CodeHistory => ({ code, past: [], future: [] })

export function codeHistoryReducer(state: CodeHistory, action: CodeHistoryAction): CodeHistory {
  if (action.type === 'change') {
    if (action.code === state.code) return state
    return { code: action.code, past: [...state.past, state.code].slice(-50), future: [] }
  }
  if (action.type === 'undo') {
    const code = state.past.at(-1)
    return code === undefined ? state : {
      code, past: state.past.slice(0, -1), future: [state.code, ...state.future].slice(0, 50),
    }
  }
  const code = state.future[0]
  return code === undefined ? state : {
    code, past: [...state.past, state.code].slice(-50), future: state.future.slice(1),
  }
}
