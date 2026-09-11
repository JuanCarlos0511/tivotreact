// Run: node tivotnative/src/features/karel/hooks/use-karel-runner.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { buildExecution, useKarelRunner } from './use-karel-runner.ts';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const initialWorld = { karelPosition: { street: 1, avenue: 1 }, karelDirection: 'ESTE', beepers: [], bagBeepers: 0 };
const code = 'iniciar-programa\n  avanza;\n  avanza;\nfinalizar-programa';

test('timed playback, pause, resume, stepping and reset never skip the initial position or duplicate moves', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let runner;
  function Harness() { runner = useKarelRunner(initialWorld); return null; }
  let view;
  act(() => { view = create(React.createElement(Harness)); });
  act(() => runner.runCode(code));
  assert.equal(runner.activeLineNumber, 1);
  assert.equal(runner.worldState.karelPosition.avenue, 1);
  act(() => t.mock.timers.tick(599));
  assert.equal(runner.activeLineNumber, 1);
  act(() => t.mock.timers.tick(1));
  assert.equal(runner.activeLineNumber, 2);
  assert.equal(runner.worldState.karelPosition.avenue, 2);
  act(() => runner.pauseExecution());
  act(() => t.mock.timers.tick(1200));
  assert.equal(runner.worldState.karelPosition.avenue, 2);
  act(() => runner.resumeExecution());
  assert.equal(runner.activeLineNumber, 3);
  assert.equal(runner.worldState.karelPosition.avenue, 3);
  act(() => runner.resetExecution());
  act(() => t.mock.timers.tick(1200));
  assert.equal(runner.activeLineNumber, null);
  assert.equal(runner.worldState.karelPosition.avenue, 1);
  assert.equal(runner.isRunning, false);
  act(() => runner.stepForward(code));
  assert.equal(runner.activeLineNumber, 1);
  act(() => runner.stepForward(code));
  assert.equal(runner.worldState.karelPosition.avenue, 2);
  act(() => runner.stepBack());
  assert.equal(runner.activeLineNumber, 1);
  assert.equal(runner.worldState.karelPosition.avenue, 1);
  act(() => runner.stepBack());
  assert.equal(runner.activeLineNumber, null);
  act(() => view.unmount());
});

test('invalid runs clear old playback, and rewind clears a collision', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let runner;
  function Harness() { runner = useKarelRunner(initialWorld); return null; }
  let view;
  act(() => { view = create(React.createElement(Harness)); });
  const collision = 'iniciar-programa\n  gira-izquierda;\n  gira-izquierda;\n  avanza;\nfinalizar-programa';
  for (let i = 0; i < 4; i++) act(() => runner.stepForward(collision));
  assert.match(runner.executionError, /muro/);
  act(() => runner.stepBack());
  assert.equal(runner.executionError, null);
  act(() => runner.runCode('iniciar-programa\napagate;\nfinalizar-programa'));
  assert.equal(runner.compileResult.success, false);
  assert.equal(runner.isRunning, false);
  assert.deepEqual(runner.steps, []);
  act(() => t.mock.timers.tick(1200));
  assert.equal(runner.worldState.karelPosition.avenue, 1);
  act(() => view.unmount());
});

test('level 4 completes its long playback without exceeding React update depth', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const levelFourWorld = {
    karelPosition: { street: 1, avenue: 1 },
    karelDirection: 'ESTE',
    beepers: [
      { street: 1, avenue: 4, count: 1 },
      { street: 5, avenue: 8, count: 1 },
      { street: 8, avenue: 3, count: 1 },
      { street: 4, avenue: 1, count: 1 },
    ],
    bagBeepers: 0,
  };
  const levelFourCode = `iniciar-programa
  repetir 4 veces inicio
    repetir 7 veces inicio
      si junto-a-ficha entonces inicio
        coge-ficha;
      fin;
      avanza;
    fin;
    gira-izquierda;
  fin;
finalizar-programa`;
  let runner;
  function Harness() { runner = useKarelRunner(levelFourWorld); return null; }
  let view;
  act(() => { view = create(React.createElement(Harness)); });
  act(() => runner.runCode(levelFourCode));

  for (let step = 0; step < 200 && runner.isRunning; step += 1) {
    act(() => t.mock.timers.tick(600));
  }

  assert.equal(runner.isRunning, false);
  assert.equal(runner.executionError, null);
  assert.equal(runner.currentStepIndex, runner.steps.length - 1);
  assert.deepEqual(runner.worldState.karelPosition, { street: 1, avenue: 1 });
  assert.equal(runner.worldState.karelDirection, 'ESTE');
  assert.equal(runner.worldState.bagBeepers, 4);
  assert.deepEqual(runner.worldState.beepers, []);
  act(() => view.unmount());
});

test('leaving a ficha never stacks a second ficha in the same cell', () => {
  const occupiedWorld = {
    karelPosition: { street: 1, avenue: 1 },
    karelDirection: 'ESTE',
    beepers: [{ street: 1, avenue: 1, count: 1 }],
    bagBeepers: 1,
  };
  const result = buildExecution('iniciar-programa\n  deja-ficha;\nfinalizar-programa', occupiedWorld);
  const finalStep = result.steps.at(-1);

  assert.equal(result.result.success, true);
  assert.match(result.steps[1].error, /Ya hay una ficha/);
  assert.deepEqual(finalStep.worldSnapshot.beepers, [{ street: 1, avenue: 1, count: 1 }]);
  assert.equal(finalStep.worldSnapshot.bagBeepers, 1);
});
