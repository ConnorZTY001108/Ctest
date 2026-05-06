import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorageApi } from '../../src/storage.js';
import { createInitialState, getDashboardStats } from '../../src/state.js';

test('createStorageApi reads and writes JSON values', () => {
  const bucket = new Map();
  const api = createStorageApi({
    getItem: (key) => bucket.get(key) ?? null,
    setItem: (key, value) => bucket.set(key, value),
    removeItem: (key) => bucket.delete(key),
  });

  api.set('question-app.progress', { answered: [1] });
  assert.deepEqual(api.get('question-app.progress', {}), { answered: [1] });
});

test('createStorageApi fails open when storage methods throw', () => {
  const api = createStorageApi({
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
  });

  assert.deepEqual(api.get('question-app.progress', { answered: [] }), { answered: [] });
  assert.doesNotThrow(() => api.set('question-app.progress', { answered: [1] }));
  assert.doesNotThrow(() => api.remove('question-app.progress'));
});

test('getDashboardStats summarizes progress and mistakes', () => {
  const questions = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const state = createInitialState(questions, {
    progress: { 1: { correct: true }, 2: { correct: false } },
    mistakes: [2],
    examHistory: [{ score: 18, total: 20 }],
  });

  assert.deepEqual(getDashboardStats(state), {
    totalQuestions: 3,
    answeredCount: 2,
    accuracy: 50,
    mistakeCount: 1,
    lastExamScore: '18 / 20',
  });
});

test('createInitialState normalizes malformed persisted values', () => {
  const state = createInitialState([{ id: 1 }], {
    progress: 'bad',
    mistakes: { not: 'an array' },
    examHistory: null,
    preferences: { theme: 'dark' },
  });

  assert.deepEqual(state.progress, {});
  assert.deepEqual(state.mistakes, []);
  assert.deepEqual(state.examHistory, []);
  assert.deepEqual(state.preferences, {
    practiceMode: 'sequential',
    activeBankId: 'zh',
    autoRemoveCorrectMistakes: true,
    theme: 'dark',
  });
});

test('createInitialState scopes banked values to the active question bank', () => {
  const state = createInitialState([{ id: 2 }, { id: 3 }], {
    progress: {
      zh: { 1: { correct: true } },
      en: { 2: { correct: false } },
    },
    mistakes: {
      zh: [1],
      en: [2, 999],
    },
    examHistory: {
      zh: [{ score: 18, total: 20 }],
      en: [{ score: 7, total: 10 }],
    },
    preferences: {
      activeBankId: 'en',
      practiceMode: 'random',
    },
  });

  assert.equal(state.bankId, 'en');
  assert.deepEqual(state.progress, { 2: { correct: false } });
  assert.deepEqual(state.mistakes, [2]);
  assert.deepEqual(state.examHistory, [{ score: 7, total: 10 }]);
  assert.deepEqual(state.progressByBank, {
    zh: { 1: { correct: true } },
    en: { 2: { correct: false } },
    core2: {},
    awsSaa: {},
  });
  assert.deepEqual(state.preferences, {
    activeBankId: 'en',
    practiceMode: 'random',
    autoRemoveCorrectMistakes: true,
  });
});

test('createInitialState supports a third configured bank bucket', () => {
  const state = createInitialState([{ id: 201 }, { id: 202 }], {
    progress: {
      zh: {},
      en: {},
      core2: { 201: { correct: true } },
    },
    mistakes: {
      zh: [],
      en: [],
      core2: [201, 999],
    },
    examHistory: {
      zh: [],
      en: [],
      core2: [{ score: 1, total: 2 }],
    },
    preferences: {
      activeBankId: 'core2',
      practiceMode: 'sequential',
    },
  });

  assert.equal(state.bankId, 'core2');
  assert.deepEqual(state.progress, { 201: { correct: true } });
  assert.deepEqual(state.mistakes, [201]);
  assert.deepEqual(state.examHistory, [{ score: 1, total: 2 }]);
  assert.deepEqual(state.progressByBank, {
    zh: {},
    en: {},
    core2: { 201: { correct: true } },
    awsSaa: {},
  });
});

test('createInitialState migrates legacy single-bank records into zh buckets', () => {
  const state = createInitialState([{ id: 1 }], {
    progress: { 1: { correct: true } },
    mistakes: [1],
    examHistory: [{ score: 1, total: 1 }],
    currentPractice: { mode: 'sequential', order: [1], currentIndex: 0 },
    currentExam: { order: [1], answers: {}, currentIndex: 0, startedAt: 10 },
    preferences: { practiceMode: 'random' },
  });

  assert.equal(state.bankId, 'zh');
  assert.deepEqual(state.progressByBank, {
    zh: { 1: { correct: true } },
    en: {},
    core2: {},
    awsSaa: {},
  });
  assert.deepEqual(state.mistakesByBank, {
    zh: [1],
    en: [],
    core2: [],
    awsSaa: [],
  });
  assert.deepEqual(state.examHistoryByBank, {
    zh: [{ score: 1, total: 1 }],
    en: [],
    core2: [],
    awsSaa: [],
  });
  assert.deepEqual(state.currentPracticeByBank, {
    zh: { mode: 'sequential', order: [1], currentIndex: 0 },
    en: null,
    core2: null,
    awsSaa: null,
  });
  assert.deepEqual(state.currentExamByBank, {
    zh: { order: [1], answers: {}, currentIndex: 0, startedAt: 10 },
    en: null,
    core2: null,
    awsSaa: null,
  });
  assert.deepEqual(state.preferences, {
    activeBankId: 'zh',
    practiceMode: 'random',
    autoRemoveCorrectMistakes: true,
  });
});
