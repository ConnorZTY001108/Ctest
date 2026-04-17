import test from 'node:test';
import assert from 'node:assert/strict';
import { createArchivePayload, createLearningArchiveService } from '../../src/learning-archive.js';

const banks = [
  { id: 'zh', label: '中文题库' },
  { id: 'en', label: 'English Question Bank' },
];

function createWritableHandle(name = 'question-archive.json') {
  const writes = [];
  return {
    name,
    writes,
    async createWritable() {
      return {
        async write(content) {
          writes.push(content);
        },
        async close() {},
      };
    },
  };
}

test('createArchivePayload serializes the full learning state by bank', () => {
  const payload = createArchivePayload({
    bankId: 'en',
    preferences: {
      activeBankId: 'en',
      practiceMode: 'random',
    },
    progressByBank: {
      zh: { 1: { correct: false, selectedAnswer: ['B'] } },
      en: { 101: { correct: true, selectedAnswer: ['A'] } },
    },
    mistakesByBank: {
      zh: [1],
      en: [],
    },
    examHistoryByBank: {
      zh: [{ score: 18, total: 20 }],
      en: [{ score: 9, total: 10 }],
    },
    currentPracticeByBank: {
      zh: { mode: 'sequential', order: [1], currentIndex: 0 },
      en: null,
    },
    currentExamByBank: {
      zh: null,
      en: { order: [101], answers: { 101: ['A'] }, currentIndex: 0, startedAt: 10 },
    },
  }, banks);

  assert.equal(payload.version, 1);
  assert.equal(payload.activeBankId, 'en');
  assert.deepEqual(payload.preferences, {
    activeBankId: 'en',
    practiceMode: 'random',
  });
  assert.match(payload.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(payload.banks.zh.mistakes, [1]);
  assert.deepEqual(payload.banks.en.progress, {
    101: { correct: true, selectedAnswer: ['A'] },
  });
  assert.deepEqual(payload.banks.en.currentExam, {
    order: [101],
    answers: { 101: ['A'] },
    currentIndex: 0,
    startedAt: 10,
  });
});

test('createLearningArchiveService binds a file and writes archive payloads', async () => {
  let storedHandle = null;
  const handle = createWritableHandle();
  const service = createLearningArchiveService({
    windowObject: {
      showSaveFilePicker: async () => handle,
    },
    handlePersistence: {
      async load() {
        return storedHandle;
      },
      async save(nextHandle) {
        storedHandle = nextHandle;
      },
      async clear() {
        storedHandle = null;
      },
    },
  });

  let status = await service.initialize();
  assert.equal(status.supported, true);
  assert.equal(status.bound, false);

  status = await service.bindFile();
  assert.equal(status.bound, true);
  assert.equal(status.fileName, 'question-archive.json');
  assert.equal(storedHandle, handle);

  status = await service.sync({
    version: 1,
    updatedAt: '2026-04-16T12:34:56.000Z',
    activeBankId: 'zh',
    preferences: { activeBankId: 'zh', practiceMode: 'sequential' },
    banks: {
      zh: { progress: {}, mistakes: [], examHistory: [], currentPractice: null, currentExam: null },
      en: { progress: {}, mistakes: [], examHistory: [], currentPractice: null, currentExam: null },
    },
  });

  assert.equal(status.syncState, 'success');
  assert.equal(status.lastSyncedAt, '2026-04-16T12:34:56.000Z');
  assert.deepEqual(JSON.parse(handle.writes[0]), {
    version: 1,
    updatedAt: '2026-04-16T12:34:56.000Z',
    activeBankId: 'zh',
    preferences: { activeBankId: 'zh', practiceMode: 'sequential' },
    banks: {
      zh: { progress: {}, mistakes: [], examHistory: [], currentPractice: null, currentExam: null },
      en: { progress: {}, mistakes: [], examHistory: [], currentPractice: null, currentExam: null },
    },
  });
});
