// Run: node tivotnative/src/features/karel/hooks/use-karel-runner.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { useKarelRunner } from './use-karel-runner.ts';

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
