import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProgramFromSuggestion } from './suggested-code.ts'

test('native wraps short suggestions and preserves complete Karel programs', () => {
  assert.equal(
    createProgramFromSuggestion(['avanza;', 'coge-ficha;']),
    'iniciar-programa\n  avanza;\n  coge-ficha;\nfinalizar-programa',
  )
  assert.equal(
    createProgramFromSuggestion(['iniciar-programa', '  avanza;', 'finalizar-programa']),
    'iniciar-programa\n  avanza;\nfinalizar-programa',
  )
})
