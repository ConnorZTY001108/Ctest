import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoute, navigate } from '../../src/router.js';

test('normalizeRoute falls back to home', () => {
  assert.equal(normalizeRoute(''), 'home');
  assert.equal(normalizeRoute('#/unknown'), 'home');
});

test('normalizeRoute returns supported screens', () => {
  assert.equal(normalizeRoute('#/practice'), 'practice');
  assert.equal(normalizeRoute('#/exam'), 'exam');
  assert.equal(normalizeRoute('#/results'), 'results');
  assert.equal(normalizeRoute('#/mistakes'), 'mistakes');
});

test('navigate updates the hash for home and non-home routes', () => {
  globalThis.window = { location: { hash: '' } };

  navigate('home');
  assert.equal(window.location.hash, '#/');

  navigate('practice');
  assert.equal(window.location.hash, '#/practice');

  delete globalThis.window;
});
