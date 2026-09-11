import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSafeKarelCodeExample,
  explicitlyRequestsCode,
  isApplicableKarelProgram,
  needsTutorResponseCorrection,
} from './tutor-response-policy.ts'

test('native detects requests for code and rejects incomplete tutor responses', () => {
  assert.equal(explicitlyRequestsCode('Quisiera que me des un código para probar'), true)
  assert.equal(needsTutorResponseCorrection({
    message: 'Pulsa Probar código.', suggestsCode: false, suggestedCode: null,
  }, true), true)
  assert.equal(explicitlyRequestsCode('¿Puedo probar un código para moverme por el contorno?'), true)
  assert.equal(explicitlyRequestsCode('Dame la solución directa de este nivel'), true)
  assert.equal(explicitlyRequestsCode('Resuélvelo completo por favor'), true)
})

test('native builds the same valid fallback for a contour request', () => {
  const code = createSafeKarelCodeExample(
    '¿Puedo probar un código para moverme por el contorno?',
    ['avanza', 'gira-izquierda', 'repetir', 'mientras'],
  )
  assert.equal(isApplicableKarelProgram(code), true)
  assert.equal(code.includes('  repetir 4 veces inicio'), true)
})

test('native accepts the same complete Karel programs as web', () => {
  assert.equal(isApplicableKarelProgram([
    'iniciar-programa', 'repetir 3 veces inicio', '  avanza;', 'fin;', 'finalizar-programa',
  ]), true)
  assert.equal(isApplicableKarelProgram(['iniciar-programa', 'avanzar()', 'finalizar-programa']), false)
})
