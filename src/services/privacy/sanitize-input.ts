const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const LONG_ACCOUNT_NUMBER_PATTERN = /(?<!\d)\d{6,10}(?!\d)/g

export const ANONYMOUS_EMAIL_TOKEN = '[CORREO_ANÓNIMO]'
export const ANONYMOUS_STUDENT_ID_TOKEN = '[MATRÍCULA_ANÓNIMA]'

/** Enmascara los patrones PII admitidos antes de persistirlos o enviarlos al LLM. */
export const sanitizeUserInput = (input: string): string =>
  input
    .replace(EMAIL_PATTERN, ANONYMOUS_EMAIL_TOKEN)
    .replace(LONG_ACCOUNT_NUMBER_PATTERN, ANONYMOUS_STUDENT_ID_TOKEN)
