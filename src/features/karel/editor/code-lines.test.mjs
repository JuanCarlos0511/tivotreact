// Run: node --experimental-strip-types src/features/karel/editor/code-lines.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  KAREL_LEVELS,
  createKarelChallenge,
} from '../../../shared/catalog/karel-levels.catalog.ts';
import {
  describeCodeLines,
  getCustomCommands,
  getInsertionIndex,
  getSiblingIndex,
  moveCodeBlock,
  removeCodeBlock,
} from './code-lines.ts';

const nestedProgram = `iniciar-programa
  inicia-ejecucion
    repetir 4 veces inicio
      repetir 7 veces inicio
        avanza;
      fin;
      gira-izquierda;
    fin;
    apagate;
  termina-ejecucion
finalizar-programa`;

test('nested blocks retain interpreter line indices and paired endings', () => {
  const lines = describeCodeLines(nestedProgram);
  assert.equal(lines[2]?.end, 7);
  assert.equal(lines[3]?.end, 5);
  assert.equal(lines[4]?.parent, 3);
  assert.equal(lines[6]?.parent, 2);
  assert.equal(lines[9]?.fixed, true);
  assert.equal(lines.length, nestedProgram.split('\n').length);
});

test('moving a nested block carries its body and closing line, and can be reversed', () => {
  const moved = moveCodeBlock(nestedProgram, 3, 1);
  assert.equal(moved.selected, 4);
  assert.deepEqual(moved.code.split('\n').slice(3, 7), [
    '      gira-izquierda;',
    '      repetir 7 veces inicio',
    '        avanza;',
    '      fin;',
  ]);
  assert.equal(moveCodeBlock(moved.code, moved.selected, -1).code, nestedProgram);
});

test('block movement respects scope boundaries and fixed program structure', () => {
  const lines = describeCodeLines(nestedProgram);
  assert.equal(getSiblingIndex(lines, 4, 1), null);
  assert.equal(getSiblingIndex(lines, 3, -1), null);
  assert.equal(getSiblingIndex(lines, 8, -1), 2);
  assert.equal(moveCodeBlock(nestedProgram, 1, 1).code, nestedProgram);
  assert.equal(moveCodeBlock(nestedProgram, 4, 1).code, nestedProgram);
});

test('deleting a block removes its entire body without deleting its parent closing line', () => {
  const nextCode = removeCodeBlock(nestedProgram, 3);
  assert.equal(
    nextCode,
    `iniciar-programa
  inicia-ejecucion
    repetir 4 veces inicio
      gira-izquierda;
    fin;
    apagate;
  termina-ejecucion
finalizar-programa`
  );
  assert.equal(removeCodeBlock(nestedProgram, 5), nestedProgram);
  assert.equal(removeCodeBlock(nestedProgram, 0), nestedProgram);
});

test('insertion defaults before shutdown and supports the inside of nested blocks', () => {
  const lines = describeCodeLines(nestedProgram);
  assert.equal(getInsertionIndex(lines, null), 8);
  assert.equal(getInsertionIndex(lines, 0), 8);
  assert.equal(getInsertionIndex(lines, 3), 4);
  assert.equal(getInsertionIndex(lines, 5), 5);
  assert.equal(getInsertionIndex(lines, 9), 9);
});

test('comments and blank lines preserve their physical source positions', () => {
  const lines = describeCodeLines(
    nestedProgram.replace('        avanza;', '        // avanzar\n\n        avanza;')
  );
  assert.equal(lines[4]?.text, '');
  assert.equal(lines[6]?.text, 'avanza;');
  assert.equal(lines[3]?.end, 7);
  assert.equal(lines[2]?.end, 9);
});

test('existing level programs keep every source line and program delimiter', () => {
  for (const level of KAREL_LEVELS) {
    const lines = describeCodeLines(level.starterCode);
    assert.equal(lines.length, level.starterCode.split('\n').length);
    assert.equal(lines[0]?.text, 'iniciar-programa');
    assert.equal(lines.at(-1)?.text, 'finalizar-programa');
    assert.equal(
      getInsertionIndex(lines, null),
      lines.findIndex((line) => line.text === 'apagate;')
    );
  }
});

test('custom procedures become call templates without changing the source', () => {
  const code = `iniciar-programa
  define-nueva-instruccion gira-derecha como inicio
    repetir 3 veces inicio
      gira-izquierda;
    fin;
  fin;
  inicia-ejecucion
    gira-derecha;
    apagate;
  termina-ejecucion
finalizar-programa`;
  const lines = describeCodeLines(code);
  assert.equal(lines[1]?.end, 5);
  assert.equal(getCustomCommands(lines)[0]?.source[0], 'gira-derecha;');
});

test('dynamic challenges always have reachable, distinct beeper corners and variable maps', () => {
  const worlds = new Set();
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const level = createKarelChallenge();
    const world = level.initialWorld;
    assert.equal(level.mode, 'challenge');
    assert.ok(world.karelPosition.street >= 1 && world.karelPosition.street <= 8);
    assert.ok(world.karelPosition.avenue >= 1 && world.karelPosition.avenue <= 4);
    assert.equal(new Set(world.beepers.map((beeper) => beeper.avenue)).size, world.beepers.length);
    for (const beeper of world.beepers) {
      assert.equal(beeper.street, world.karelPosition.street);
      assert.ok(beeper.avenue >= world.karelPosition.avenue && beeper.avenue <= 8);
      assert.ok(beeper.count >= 1 && beeper.count <= 2);
    }
    worlds.add(JSON.stringify(world));
  }
  assert.ok(worlds.size > 1);
});
