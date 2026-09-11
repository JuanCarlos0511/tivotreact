// Run: node --test src/features/karel/editor/code-lines.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

for (const root of ['../../..', '../../../../tivotnative/src']) {
  const base = new URL(root + '/', import.meta.url);
  const { describeCodeLines, getCustomCommands, getInsertionIndex, moveCodeBlock, removeCodeBlock, COMMAND_TEMPLATES } = await import(new URL('features/karel/editor/code-lines.ts', base));
  const { KAREL_LEVELS, createKarelChallenge } = await import(new URL('shared/catalog/karel-levels.catalog.ts', base));
  const { getInitialTutorialStepForLevel } = await import(new URL('features/karel/editor/tutorial.ts', base));
  const { buildExecution } = await import(new URL('features/karel/hooks/use-karel-runner.ts', base));
  const { getTotalLevelBeepers, isLevelGoalComplete } = await import(new URL('features/karel/goals/level-goal.ts', base));
  const bundle = await build({ entryPoints: [new URL('features/karel/editor/edit-program.ts', base).pathname], bundle: true, write: false, platform: 'node', format: 'esm' });
  const { configureProgramLine, insertProgramLines } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const world = KAREL_LEVELS[0].initialWorld;
  const program = `iniciar-programa
  repetir 2 veces inicio
    repetir 3 veces inicio
      gira-izquierda;
    fin;
    avanza;
  fin;
finalizar-programa`;
  const run = body => buildExecution(`iniciar-programa\n${body}\nfinalizar-programa`, world);

  test(`${root}: only program boundaries are immutable; nested scopes retain source positions`, () => {
    const lines = describeCodeLines(program);
    assert.deepEqual(lines.flatMap((line, index) => line.fixed ? [index] : []), [0, 7]);
    assert.equal(lines[1].end, 6);
    assert.equal(lines[2].end, 4);
    assert.equal(lines[3].parent, 2);
    assert.equal(lines[3].depth, 3);
    assert.equal(lines[4].closingBlock, 2);
    assert.equal(getInsertionIndex(lines, 0), 1);
    assert.equal(getInsertionIndex(lines, null), 7);
    assert.equal(getInsertionIndex(lines, 2), 3);
    assert.equal(getInsertionIndex(lines, 4), 5);
  });
  test(`${root}: moving and deleting whole blocks preserves nesting and boundaries`, () => {
    const moved = moveCodeBlock(program, 2, 1);
    assert.equal(moved.selected, 3);
    assert.equal(moveCodeBlock(moved.code, moved.selected, -1).code, program);
    assert.equal(moveCodeBlock(program, 0, 1).code, program);
    assert.equal(moveCodeBlock(program, 3, 1).code, program);
    assert.equal(removeCodeBlock(program, 0), program);
    assert.equal(removeCodeBlock(program, 7), program);
    assert.equal(removeCodeBlock(program, 4), removeCodeBlock(program, 2));
    assert.equal(describeCodeLines(removeCodeBlock(program, 2))[1].end, 3);
  });
  test(`${root}: changing parameters keeps bodies and renaming a method updates calls`, () => {
    assert.equal(configureProgramLine(program, 1, 'repetir 5 veces inicio'), program.replace('repetir 2', 'repetir 5'));
    const method = `iniciar-programa\n  define-nueva-instruccion giro como inicio\n    gira-izquierda;\n  fin;\n  giro; // llamada\nfinalizar-programa`;
    const renamed = configureProgramLine(method, 1, 'define-nueva-instruccion vuelta como inicio');
    assert.ok(renamed.includes('  vuelta; // llamada'));
    assert.deepEqual(getCustomCommands(describeCodeLines(renamed)).map(c => c.id), ['vuelta']);
    assert.equal(buildExecution(renamed, world).result.success, true);
    const inserted = insertProgramLines(program, ['avanza;'], 0);
    assert.equal(inserted.code.split('\n')[1], '  avanza;');
    assert.equal(inserted.code.split('\n').at(-1), 'finalizar-programa');
    const insertedAfterSelection = insertProgramLines(program, ['coge-ficha;'], 3, {
      index: getInsertionIndex(describeCodeLines(program), 3),
      replaceSelection: false,
    });
    assert.equal(insertedAfterSelection.code.split('\n')[4], '      coge-ficha;');
    assert.equal(insertedAfterSelection.code.split('\n')[3], '      gira-izquierda;');
    const replacedSelection = insertProgramLines(program, ['coge-ficha;'], 3, {
      index: 3,
      replaceSelection: true,
    });
    assert.equal(replacedSelection.code.split('\n')[3], '      coge-ficha;');
    assert.equal(replacedSelection.code.split('\n').length, program.split('\n').length);
  });
  test(`${root}: selecting fin inserts the next command outside the closed block`, () => {
    const nestedClosingLine = 4;
    const afterNestedBlock = insertProgramLines(program, ['coge-ficha;'], nestedClosingLine, {
      index: getInsertionIndex(describeCodeLines(program), nestedClosingLine),
      replaceSelection: false,
    });
    assert.equal(afterNestedBlock.code.split('\n')[5], '    coge-ficha;');
    assert.equal(afterNestedBlock.code.split('\n')[6], '    avanza;');

    const conditional = `iniciar-programa\n  si junto-a-ficha entonces inicio\n    coge-ficha;\n  fin;\nfinalizar-programa`;
    const afterConditional = insertProgramLines(conditional, ['avanza;'], 3, {
      index: getInsertionIndex(describeCodeLines(conditional), 3),
      replaceSelection: false,
    });
    assert.equal(afterConditional.code.split('\n')[4], '  avanza;');
    assert.equal(afterConditional.code.split('\n')[5], 'finalizar-programa');
  });
  test(`${root}: playback starts at line one without moving and executes consecutive moves once each`, () => {
    const { result, steps } = run('  avanza;\n  avanza;');
    assert.equal(result.success, true);
    assert.deepEqual(steps.map(s => s.lineNumber), [1, 2, 3, 4]);
    assert.deepEqual(steps.map(s => s.worldSnapshot.karelPosition.avenue), [1, 2, 3, 3]);
    assert.deepEqual(world.karelPosition, { street: 1, avenue: 1 });
    assert.equal(steps.at(-1).command, 'finalizar-programa');
  });
  test(`${root}: nested loop progress survives every body step and closing line`, () => {
    const { steps } = buildExecution(program, { ...world, karelPosition: { street: 4, avenue: 4 } });
    const rotations = steps.filter(s => s.command === 'gira-izquierda;');
    assert.deepEqual(rotations.map(s => s.loops.map(l => l.iteration)), [[1,1],[1,2],[1,3],[2,1],[2,2],[2,3]]);
    assert.deepEqual(rotations[0].loops.map(l => [l.lineNumber,l.endLineNumber,l.total]), [[2,7,2],[3,5,3]]);
    assert.equal(steps.at(-1).command, 'finalizar-programa');
    assert.deepEqual(steps.at(-1).loops, []);
  });
  test(`${root}: while and conditional headers are visible, including false conditions`, () => {
    const { steps } = run('  mientras frente-libre hacer inicio\n    avanza;\n  fin;\n  si junto-a-ficha entonces inicio\n    coge-ficha;\n  fin;');
    assert.equal(steps.filter(s => s.command === 'avanza;').length, 7);
    assert.equal(steps.filter(s => s.lineNumber === 2).length, 8);
    assert.equal(steps.find(s => s.lineNumber === 5).command, 'si junto-a-ficha');
    assert.equal(steps.some(s => s.command === 'coge-ficha;'), false);
    assert.equal(steps.at(-1).worldSnapshot.karelPosition.avenue, 8);
  });
  test(`${root}: wall and bag errors stop on the offending line with the last valid world`, () => {
    const collision = run('  repetir 9 veces inicio\n    avanza;\n  fin;').steps.at(-1);
    assert.match(collision.error, /muro/);
    assert.equal(collision.lineNumber, 3);
    assert.equal(collision.worldSnapshot.karelPosition.avenue, 8);
    assert.equal(collision.loops[0].iteration, 8);
    assert.match(run('  coge-ficha;').steps.at(-1).error, /No hay fichas/);
    assert.match(run('  deja-ficha;').steps.at(-1).error, /mochila/);
  });
  test(`${root}: invalid syntax, removed commands and unmatched delimiters are rejected`, () => {
    for (const body of ['apagate;', 'apagar;', 'inicia-ejecucion\navanza;\ntermina-ejecucion', 'fin;', 'repetir 2 veces inicio\navanza;', 'repetir 0 veces inicio\nfin;', 'define-nueva-instruccion apagate como inicio\nfin;']) {
      assert.equal(run(body).result.success, false, body);
    }
    assert.equal(run('avanza;').result.warning, undefined);
    assert.equal(COMMAND_TEMPLATES.some(c => c.id === 'apagate'), false);
  });
  test(`${root}: infinite, huge and recursive programs are bounded`, () => {
    for (const body of ['mientras frente-libre hacer inicio\nfin;', 'repetir 999999999 veces inicio\nfin;', 'define-nueva-instruccion otra como inicio\notra;\nfin;\notra;']) {
      const { steps } = run(body);
      assert.ok(steps.at(-1).error, body);
      assert.ok(steps.length <= 4096);
    }
  });
  test(`${root}: levels use the new syntax and challenges contain no duplicate introduction`, () => {
    assert.deepEqual(KAREL_LEVELS.map(level => [...level.quickCommands]), [
      ['avanza'],
      ['repetir', 'avanza'],
      ['avanza', 'gira-izquierda', 'repetir'],
      ['avanza', 'gira-izquierda', 'repetir', 'si', 'coge-ficha'],
    ]);
    assert.equal(getInitialTutorialStepForLevel(4), 'quickCommands');
    for (const level of [...KAREL_LEVELS, ...Array.from({ length: 100 }, createKarelChallenge)]) {
      assert.equal(buildExecution(level.starterCode, level.initialWorld).result.success, true);
      assert.doesNotMatch(level.starterCode, /apagate|inicia-ejecucion|termina-ejecucion/);
      if (level.mode === 'challenge') {
        assert.equal(level.initialMessage, '');
        assert.equal(
          new Set(level.initialWorld.beepers.map(b => `${b.street},${b.avenue}`)).size,
          level.initialWorld.beepers.length,
        );
      }
    }
  });
  test(`${root}: level goals require the intended route and all required beepers`, () => {
    const levelThree = KAREL_LEVELS[2];
    const levelFour = KAREL_LEVELS[3];
    assert.equal(isLevelGoalComplete(levelThree, levelThree.initialWorld, []), false);
    assert.equal(isLevelGoalComplete(levelFour, levelFour.initialWorld, []), false);
    for (const level of [levelThree, levelFour]) {
      const { steps } = buildExecution(level.starterCode, level.initialWorld);
      assert.equal(isLevelGoalComplete(level, steps.at(-1).worldSnapshot, steps), true);
    }
    assert.equal(getTotalLevelBeepers(levelFour), 4);
    const challenge = createKarelChallenge();
    assert.equal(isLevelGoalComplete(challenge, challenge.initialWorld, []), false);
    assert.ok(getTotalLevelBeepers(challenge) >= 2);
  });
}
