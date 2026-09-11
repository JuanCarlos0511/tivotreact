import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSafeKarelCodeExample,
  explicitlyRequestsCode,
  isApplicableKarelProgram,
  needsTutorResponseCorrection,
} from './tutor-response-policy.ts'

test('detects explicit Spanish requests for code', () => {
  assert.equal(explicitlyRequestsCode('Quisiera probar que me des un codigo para este nivel'), true)
  assert.equal(explicitlyRequestsCode('Ya intenté y me choqué, ponme el ejemplo'), true)
  assert.equal(explicitlyRequestsCode('¿Qué debería observar en la siguiente casilla?'), false)
  assert.equal(explicitlyRequestsCode('¿Puedo probar un código para moverme por el contorno?'), true)
  assert.equal(explicitlyRequestsCode('Dame la solución directa de este nivel'), true)
  assert.equal(explicitlyRequestsCode('Resuélvelo completo por favor'), true)
})

test('rejects responses that promise Probar código without applicable lines', () => {
  assert.equal(needsTutorResponseCorrection({
    message: 'Pulsa el botón verde Probar código.',
    suggestsCode: false,
    suggestedCode: null,
  }, true), true)

  assert.equal(needsTutorResponseCorrection({
    message: 'Pulsa Probar código para cargar el ejemplo.',
    suggestsCode: true,
    suggestedCode: ['iniciar-programa', '  avanza;', 'finalizar-programa'],
  }, true), false)
})

test('accepts real Karel programs and rejects placeholder function syntax', () => {
  assert.equal(isApplicableKarelProgram([
    'iniciar-programa',
    'repetir 3 veces inicio',
    '  avanza;',
    'fin;',
    'finalizar-programa',
  ]), true)
  assert.equal(isApplicableKarelProgram([
    'iniciar-programa',
    'avanzar()',
    'finalizar-programa',
  ]), false)
})

test('builds a valid local contour example when the model response is unusable', () => {
  const code = createSafeKarelCodeExample(
    '¿Puedo probar un código para moverme por el contorno?',
    ['avanza', 'gira-izquierda', 'repetir', 'mientras'],
  )

  assert.equal(isApplicableKarelProgram(code), true)
  assert.equal(code.includes('  repetir 4 veces inicio'), true)
  assert.equal(code.includes('    repetir 3 veces inicio'), true)
})
