import assert from 'node:assert/strict'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const bundle = await build({
  entryPoints: [path.join(projectRoot, 'src/services/parser.service.ts')],
  alias: { '@shared': path.join(projectRoot, 'src/shared') },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
})
const parser = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
)

test('parses the structured tutor response and keeps suggested Karel lines', () => {
  const payload = parser.parseAssistantPayload(JSON.stringify({
    mensaje: 'Prueba estos dos pasos.',
    sugiereCodigo: true,
    codigoSugerido: ['avanza;', 'coge-ficha;'],
  }))

  assert.equal(payload.message, 'Prueba estos dos pasos.')
  assert.equal(payload.suggestsCode, true)
  assert.deepEqual(payload.suggestedCode, ['avanza;', 'coge-ficha;'])
})

test('falls back to a friendly text payload when the response is not JSON', () => {
  const payload = parser.parseAssistantPayload('Observa qué hay en la siguiente casilla.')
  assert.equal(payload.message, 'Observa qué hay en la siguiente casilla.')
  assert.equal(payload.suggestsCode, false)
  assert.equal(payload.suggestedCode, null)
})
