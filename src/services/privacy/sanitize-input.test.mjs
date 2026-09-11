import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ANONYMOUS_EMAIL_TOKEN,
  ANONYMOUS_STUDENT_ID_TOKEN,
  sanitizeUserInput,
} from './sanitize-input.ts'

test('masks email addresses without changing the surrounding message', () => {
  assert.equal(
    sanitizeUserInput('Mi correo es Alumno.Test+1@ejemplo.edu.mx, ¿me ayudas?'),
    `Mi correo es ${ANONYMOUS_EMAIL_TOKEN}, ¿me ayudas?`,
  )
})

test('masks standalone account numbers from 6 through 10 digits', () => {
  assert.equal(
    sanitizeUserInput('Matrículas: 123456 y 1234567890.'),
    `Matrículas: ${ANONYMOUS_STUDENT_ID_TOKEN} y ${ANONYMOUS_STUDENT_ID_TOKEN}.`,
  )
})

test('does not partially mask shorter or longer digit sequences', () => {
  assert.equal(sanitizeUserInput('Códigos 12345 y 12345678901.'), 'Códigos 12345 y 12345678901.')
})
