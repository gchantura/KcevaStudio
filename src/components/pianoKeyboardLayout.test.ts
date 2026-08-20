import test from 'node:test';
import assert from 'node:assert/strict';
import { getBlackKeyLeft, isRootNote } from './PianoKeyboard';

test('black key layout matches piano geometry', () => {
  assert.equal(getBlackKeyLeft('C#4', 4), 24);
  assert.equal(getBlackKeyLeft('D#4', 4), 64);
  assert.equal(getBlackKeyLeft('F#4', 4), 144);
  assert.equal(getBlackKeyLeft('C#5', 4), 304);
});

test('root markers only match the exact note name', () => {
  assert.equal(isRootNote('C4', 'C'), true);
  assert.equal(isRootNote('C#4', 'C'), false);
  assert.equal(isRootNote('C#5', 'C#'), true);
});
