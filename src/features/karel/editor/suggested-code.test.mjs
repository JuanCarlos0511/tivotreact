import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProgramFromSuggestion } from './suggested-code.ts'

test('wraps a short tutor suggestion in a valid Karel program', () => {
  assert.equal(
    createProgramFromSuggestion(['avanza;', 'coge-ficha;']),
    'iniciar-programa\n  avanza;\n  coge-ficha;\nfinalizar-programa',
  )
})

test('keeps a complete program and rejects incomplete boundaries', () => {
  assert.equal(
    createProgramFromSuggestion(['iniciar-programa', '  avanza;', 'finalizar-programa']),
    'iniciar-programa\n  avanza;\nfinalizar-programa',
  )
  assert.equal(createProgramFromSuggestion(['iniciar-programa', 'avanza;']), null)
  assert.equal(createProgramFromSuggestion([]), null)
})
