import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

const sampleQuestions = [
  {
    id: 1,
    topic: 'Topic 1',
    stem: 'Question 1',
    options: [
      { key: 'A', text: 'Alpha' },
      { key: 'B', text: 'Beta' },
    ],
    answer: ['A'],
    type: 'single',
  },
  {
    id: 2,
    topic: 'Topic 2',
    stem: 'Question 2',
    options: [
      { key: 'C', text: 'Gamma' },
      { key: 'D', text: 'Delta' },
    ],
    answer: ['C'],
    type: 'single',
  },
];

const sampleEnglishQuestions = [
  {
    id: 101,
    topic: 'Topic 1',
    stem: 'English Question 1',
    options: [
      { key: 'A', text: 'Alpha EN' },
      { key: 'B', text: 'Beta EN' },
    ],
    answer: ['A'],
    type: 'single',
  },
];

function createClassList() {
  const classes = new Set();
  return {
    toggle(name, force) {
      if (force) {
        classes.add(name);
      } else {
        classes.delete(name);
      }
    },
    contains(name) {
      return classes.has(name);
    },
  };
}

function cloneValue(value) {
  return value === undefined ? value : structuredClone(value);
}

function createMutableStorage(initialData = {}) {
  const bucket = new Map(
    Object.entries(initialData).map(([key, value]) => [key, cloneValue(value)]),
  );
  const events = [];

  return {
    events,
    get(key, fallback) {
      return bucket.has(key) ? cloneValue(bucket.get(key)) : fallback;
    },
    set(key, value) {
      const nextValue = cloneValue(value);
      bucket.set(key, nextValue);
      events.push([key, nextValue]);
    },
    remove(key) {
      bucket.delete(key);
      events.push([key, undefined]);
    },
    dump() {
      return Object.fromEntries(
        [...bucket.entries()].map(([key, value]) => [key, cloneValue(value)]),
      );
    },
  };
}

function setupAppEnvironment(hash = '', options = {}) {
  const appElement = { innerHTML: '' };
  const buttons = ['home', 'practice', 'exam', 'mistakes'].map((route) => ({
    dataset: { route },
    classList: createClassList(),
  }));
  const listeners = {};
  const listenerLists = {};
  const listenerCounts = {};

  globalThis.window = {
    location: { hash },
    addEventListener(type, handler) {
      listenerCounts[type] = (listenerCounts[type] ?? 0) + 1;
      listenerLists[type] ??= [];
      listenerLists[type].push(handler);
      listeners[type] = handler;
    },
  };

  globalThis.document = {
    querySelector(selector) {
      return selector === '#app' ? appElement : null;
    },
    querySelectorAll(selector) {
      if (options.querySelectorAllImpl) {
        const result = options.querySelectorAllImpl(selector, buttons);
        if (result) return result;
      }
      return selector === '[data-route]' ? buttons : [];
    },
    addEventListener(type, handler) {
      listenerCounts[type] = (listenerCounts[type] ?? 0) + 1;
      listenerLists[type] ??= [];
      listenerLists[type].push(handler);
      listeners[type] = handler;
    },
  };

  return {
    appElement,
    buttons,
    listeners,
    listenerCounts,
    dispatchDocument(type, event) {
      for (const handler of listenerLists[type] ?? []) {
        handler(event);
      }
    },
    dispatchWindow(type, event) {
      for (const handler of listenerLists[type] ?? []) {
        handler(event);
      }
    },
  };
}

function cleanupAppEnvironment() {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.fetch;
}

afterEach(() => {
  cleanupAppEnvironment();
});

async function loadAppModule() {
  return import(`../../src/app.js?test=${Date.now()}-${Math.random()}`);
}

function createQuestionBankFetch(questionBanks = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true,
      json: async () => cloneValue(questionBanks[url] ?? sampleQuestions),
    };
  };

  fetchImpl.calls = calls;
  return fetchImpl;
}

function createArchiveStub(initialStatus = {}) {
  let status = {
    supported: true,
    bound: false,
    fileName: '',
    syncState: 'idle',
    lastSyncedAt: null,
    message: '未创建学习存档 JSON。',
    ...initialStatus,
  };
  const calls = {
    initialize: 0,
    bind: 0,
    syncPayloads: [],
  };

  return {
    calls,
    isSupported() {
      return status.supported;
    },
    getStatus() {
      return { ...status };
    },
    async initialize() {
      calls.initialize += 1;
      return { ...status };
    },
    async bindFile() {
      calls.bind += 1;
      status = {
        ...status,
        bound: true,
        fileName: 'question-archive.json',
        message: '已绑定学习存档。',
      };
      return { ...status };
    },
    async sync(payload) {
      calls.syncPayloads.push(cloneValue(payload));
      status = {
        ...status,
        bound: true,
        syncState: 'success',
        lastSyncedAt: payload.updatedAt,
        message: '最近同步成功。',
      };
      return { ...status };
    },
  };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function setupBootstrapEnvironment({
  hash = '',
  fetchImpl,
  onAppElement,
  calls = [],
  querySelectorAllImpl,
} = {}) {
  const appElement = {
    _html: '',
    set innerHTML(value) {
      calls.push(`render:${value}`);
      this._html = value;
      onAppElement?.(value, calls);
    },
    get innerHTML() {
      return this._html;
    },
  };
  const buttons = ['home', 'practice', 'exam', 'mistakes'].map((route) => ({
    dataset: { route },
    classList: createClassList(),
  }));

  const listeners = {};
  const listenerLists = {};
  const listenerCounts = {};
  const windowStub = {
    location: { hash },
    addEventListener(type, handler) {
      listenerCounts[type] = (listenerCounts[type] ?? 0) + 1;
      listenerLists[type] ??= [];
      listenerLists[type].push(handler);
      listeners[type] = handler;
    },
  };
  const documentStub = {
    querySelector(selector) {
      return selector === '#app' ? appElement : null;
    },
    querySelectorAll(selector) {
      if (querySelectorAllImpl) {
        const result = querySelectorAllImpl(selector, buttons);
        if (result) return result;
      }
      return selector === '[data-route]' ? buttons : [];
    },
    addEventListener(type, handler) {
      listenerCounts[type] = (listenerCounts[type] ?? 0) + 1;
      listenerLists[type] ??= [];
      listenerLists[type].push(handler);
      listeners[type] = handler;
    },
  };

  globalThis.window = windowStub;
  globalThis.document = documentStub;
  globalThis.fetch = fetchImpl;

  return {
    appElement,
    buttons,
    calls,
    windowStub,
    documentStub,
    listeners,
    listenerCounts,
    dispatchDocument(type, event) {
      for (const handler of listenerLists[type] ?? []) {
        handler(event);
      }
    },
    dispatchWindow(type, event) {
      for (const handler of listenerLists[type] ?? []) {
        handler(event);
      }
    },
  };
}

test('bootstrap renders the current hash on initial load', async () => {
  const env = setupAppEnvironment('#/practice');
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  await loadAppModule();

  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.equal(env.buttons[1].classList.contains('is-active'), true);
  assert.equal(env.buttons[0].classList.contains('is-active'), false);
});

test('bootstrapApp hydrates persisted values before first render', async () => {
  const events = [];
  const storage = {
    get(key, fallback) {
      events.push(`get:${key}`);
      return fallback;
    },
    set() {},
    remove() {},
  };
  const env = setupBootstrapEnvironment({
    hash: '#/practice',
    calls: events,
    fetchImpl: async () => ({
      ok: true,
      json: async () => sampleQuestions,
    }),
  });

  const app = await loadAppModule();
  assert.equal(typeof app.bootstrapApp, 'function');
  events.length = 0;

  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: env.windowStub,
    document: env.documentStub,
  });

  assert.deepEqual(events.slice(0, 6), [
    'get:question-app.progress',
    'get:question-app.mistakes',
    'get:question-app.exam-history',
    'get:question-app.preferences',
    'get:question-app.current-practice',
    'get:question-app.current-exam',
  ]);
  assert.match(events[6], /Question 1/);
  assert.match(env.appElement.innerHTML, /Question 1/);
});

test('bootstrapApp loads the active question bank from preferences', async () => {
  const fetchImpl = createQuestionBankFetch({
    './data/questions.zh.json': sampleQuestions,
    './data/questions.en.json': sampleEnglishQuestions,
  });
  const env = setupBootstrapEnvironment({ fetchImpl });
  const storage = {
    get(key, fallback) {
      if (key === 'question-app.preferences') {
        return { activeBankId: 'en', practiceMode: 'sequential' };
      }
      return fallback;
    },
    set() {},
    remove() {},
  };

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: fetchImpl,
    storage,
    window: env.windowStub,
    document: env.documentStub,
  });

  assert.equal(fetchImpl.calls.at(-1), './data/questions.en.json');
  assert.match(env.appElement.innerHTML, /English Question Bank/);
});

test('binding a learning archive writes the current full state without clearing mistakes', async () => {
  const fetchImpl = createQuestionBankFetch({
    './data/questions.zh.json': sampleQuestions,
    './data/questions.en.json': sampleEnglishQuestions,
  });
  const archive = createArchiveStub();
  const env = setupAppEnvironment('#/mistakes');
  const storage = createMutableStorage({
    'question-app.preferences': { activeBankId: 'zh', practiceMode: 'sequential' },
    'question-app.mistakes': { zh: [2, 1], en: [] },
  });
  globalThis.fetch = fetchImpl;

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: fetchImpl,
    storage,
    archive,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(env.appElement.innerHTML, /创建学习存档 JSON/);

  await env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'bind-learning-archive' } }
          : null;
      },
    },
  });
  await flushAsyncWork();

  assert.equal(archive.calls.bind, 1);
  assert.equal(archive.calls.syncPayloads.length, 1);
  assert.deepEqual(archive.calls.syncPayloads[0].banks.zh.mistakes, [2, 1]);
  assert.deepEqual(storage.dump()['question-app.mistakes'], { zh: [2, 1], en: [] });
  assert.match(env.appElement.innerHTML, /question-archive\.json/);
});

test('selecting a different question bank updates preferences and reloads home stats', async () => {
  const fetchImpl = createQuestionBankFetch({
    './data/questions.zh.json': sampleQuestions,
    './data/questions.en.json': sampleEnglishQuestions,
  });
  const env = setupAppEnvironment('#/');
  const storage = createMutableStorage({
    'question-app.preferences': { activeBankId: 'zh', practiceMode: 'sequential' },
    'question-app.progress': {
      zh: { 1: { correct: true, selectedAnswer: ['A'] } },
      en: {},
    },
  });
  globalThis.fetch = fetchImpl;

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: fetchImpl,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  await env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'select-bank', bankId: 'en' } }
          : null;
      },
    },
  });

  assert.equal(storage.dump()['question-app.preferences']?.activeBankId, 'en');
  assert.equal(fetchImpl.calls.at(-1), './data/questions.en.json');
  assert.match(env.appElement.innerHTML, /English Question Bank/);
  assert.match(env.appElement.innerHTML, /题库总量<\/span><strong>1<\/strong>/);
});

test('bootstrapApp renders failure UI when loading questions fails', async () => {
  const env = setupBootstrapEnvironment({
    fetchImpl: async () => ({
      ok: false,
      json: async () => [],
    }),
  });

  const app = await loadAppModule();
  assert.equal(typeof app.bootstrapApp, 'function');
  env.calls.length = 0;

  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage: {
      get() {
        return {};
      },
      set() {},
      remove() {},
    },
    window: env.windowStub,
    document: env.documentStub,
  });

  assert.match(env.appElement.innerHTML, /<h2>题库加载失败<\/h2>/);
  assert.match(env.appElement.innerHTML, /题库加载失败/);
});

test('clicking a nav item updates the hash', async () => {
  const env = setupAppEnvironment();
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  await loadAppModule();
  env.listeners.click({
    target: {
      closest() {
        return env.buttons[2];
      },
    },
  });

  assert.equal(window.location.hash, '#/exam');
});

test('clicking the home primary CTA routes into practice mode', async () => {
  const env = setupAppEnvironment();
  const storageEvents = [];
  const storage = {
    get(key, fallback) {
      return fallback;
    },
    set(key, value) {
      storageEvents.push([key, value]);
    },
    remove() {},
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });
  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action="start-practice"]'
          ? { dataset: { action: 'start-practice', mode: 'sequential' } }
          : null;
      },
    },
  });

  assert.equal(window.location.hash, '#/practice');
  assert.deepEqual(storageEvents.filter(([key]) => key === 'question-app.current-practice').at(-1), [
    'question-app.current-practice',
    {
      zh: { mode: 'sequential', order: [1, 2], currentIndex: 0 },
      en: null,
    },
  ]);
});

test('submitting a practice answer shows immediate feedback and persists progress', async () => {
  const storageEvents = [];
  const env = setupAppEnvironment('#/practice', {
    querySelectorAllImpl(selector) {
      if (selector === 'input[name="answer"]:checked') {
        return [{ value: 'B' }];
      }
      return null;
    },
  });
  const storage = {
    get(key, fallback) {
      if (key === 'question-app.preferences') {
        return { practiceMode: 'sequential' };
      }
      return fallback;
    },
    set(key, value) {
      storageEvents.push([key, value]);
    },
    remove() {},
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'practice-submit' } }
          : null;
      },
    },
  });

  assert.match(env.appElement.innerHTML, /回答错误/);
  assert.match(env.appElement.innerHTML, /正确答案：A/);
  assert.deepEqual(storageEvents, [
    ['question-app.progress', { zh: { 1: { correct: false, selectedAnswer: ['B'] } }, en: {} }],
    ['question-app.mistakes', { zh: [1], en: [] }],
    ['question-app.exam-history', { zh: [], en: [] }],
    ['question-app.preferences', { practiceMode: 'sequential', activeBankId: 'zh' }],
    ['question-app.current-practice', { zh: { mode: 'sequential', order: [1, 2], currentIndex: 0 }, en: null }],
    ['question-app.current-exam', { zh: null, en: null }],
  ]);
});

test('submitting a practice answer auto-syncs the bound learning archive', async () => {
  const archive = createArchiveStub({
    bound: true,
    fileName: 'question-archive.json',
    message: '已绑定学习存档。',
  });
  const env = setupAppEnvironment('#/practice', {
    querySelectorAllImpl(selector) {
      if (selector === 'input[name="answer"]:checked') {
        return [{ value: 'B' }];
      }
      return null;
    },
  });
  globalThis.fetch = createQuestionBankFetch({
    './data/questions.zh.json': sampleQuestions,
    './data/questions.en.json': sampleEnglishQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage: createMutableStorage({
      'question-app.preferences': { activeBankId: 'zh', practiceMode: 'sequential' },
    }),
    archive,
    window: globalThis.window,
    document: globalThis.document,
  });
  archive.calls.syncPayloads.length = 0;

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'practice-submit' } }
          : null;
      },
    },
  });
  await flushAsyncWork();

  assert.equal(archive.calls.syncPayloads.length, 1);
  assert.deepEqual(archive.calls.syncPayloads[0].banks.zh.progress, {
    1: { correct: false, selectedAnswer: ['B'] },
  });
});

test('bootstrapApp restores an in-progress random practice session after reload', async () => {
  const env = setupAppEnvironment('#/practice');
  const storage = {
    get(key, fallback) {
      if (key === 'question-app.preferences') {
        return { practiceMode: 'random' };
      }
      if (key === 'question-app.progress') {
        return { 2: { correct: false, selectedAnswer: ['D'] } };
      }
      if (key === 'question-app.current-practice') {
        return { mode: 'random', order: [2, 1], currentIndex: 0 };
      }
      return fallback;
    },
    set() {},
    remove() {},
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(env.appElement.innerHTML, /Question 2/);
  assert.match(env.appElement.innerHTML, /回答错误/);
  assert.match(env.appElement.innerHTML, /value="D"/);
  assert.match(env.appElement.innerHTML, /value="D"[\s\S]*checked/);
});

test('practice navigation persists currentIndex on next and prev', async () => {
  const storageEvents = [];
  const env = setupAppEnvironment('#/practice');
  const storage = {
    get(key, fallback) {
      if (key === 'question-app.preferences') {
        return { practiceMode: 'sequential' };
      }
      return fallback;
    },
    set(key, value) {
      storageEvents.push([key, value]);
    },
    remove() {},
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'practice-next' } }
          : null;
      },
    },
  });

  assert.match(env.appElement.innerHTML, /Question 2/);
  assert.deepEqual(storageEvents.filter(([key]) => key === 'question-app.current-practice').at(-1), [
    'question-app.current-practice',
    {
      zh: { mode: 'sequential', order: [1, 2], currentIndex: 1 },
      en: null,
    },
  ]);

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'practice-prev' } }
          : null;
      },
    },
  });

  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.deepEqual(storageEvents.filter(([key]) => key === 'question-app.current-practice').at(-1), [
    'question-app.current-practice',
    {
      zh: { mode: 'sequential', order: [1, 2], currentIndex: 0 },
      en: null,
    },
  ]);
});

test('exam route renders unanswered questions and supports prev/next navigation', async () => {
  let selectedAnswers = ['A'];
  const env = setupAppEnvironment('#/exam', {
    querySelectorAllImpl(selector) {
      if (selector === 'input[name="answer"]:checked') {
        return selectedAnswers.map((value) => ({ value }));
      }
      return null;
    },
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage: {
      get(key, fallback) {
        return fallback;
      },
      set() {},
      remove() {},
    },
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.doesNotMatch(env.appElement.innerHTML, /正确答案/);

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-next' } }
          : null;
      },
    },
  });

  selectedAnswers = ['D'];
  assert.match(env.appElement.innerHTML, /Question 2/);

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-prev' } }
          : null;
      },
    },
  });

  assert.match(env.appElement.innerHTML, /Question 1/);
});

test('submitting an exam stores the result and restores it on the results route after reload', async () => {
  let selectedAnswers = ['A'];
  const storageEvents = [];
  const storage = {
    get(key, fallback) {
      return fallback;
    },
    set(key, value) {
      storageEvents.push([key, value]);
    },
    remove() {},
  };
  const env = setupAppEnvironment('#/exam', {
    querySelectorAllImpl(selector) {
      if (selector === 'input[name="answer"]:checked') {
        return selectedAnswers.map((value) => ({ value }));
      }
      return null;
    },
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-next' } }
          : null;
      },
    },
  });

  selectedAnswers = ['D'];
  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-submit' } }
          : null;
      },
    },
  });

  assert.equal(window.location.hash, '#/results');
  assert.match(env.appElement.innerHTML, /考试结果/);
  assert.match(env.appElement.innerHTML, /得分：1 \/ 2/);
  assert.match(env.appElement.innerHTML, /第 2 题，正确答案：C/);

  const latestExamHistory = storageEvents.filter(([key]) => key === 'question-app.exam-history').at(-1)?.[1].zh;
  assert.deepEqual(latestExamHistory, [
    {
      score: 1,
      total: 2,
      wrongIds: [2],
      durationSeconds: latestExamHistory[0].durationSeconds,
    },
  ]);

  cleanupAppEnvironment();

  const reloadEnv = setupAppEnvironment('#/results');
  const reloadedStorage = {
    get(key, fallback) {
      if (key === 'question-app.exam-history') {
        return { zh: latestExamHistory, en: [] };
      }
      return fallback;
    },
    set() {},
    remove() {},
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const reloadedApp = await loadAppModule();
  await reloadedApp.bootstrapApp({
    fetch: globalThis.fetch,
    storage: reloadedStorage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(reloadEnv.appElement.innerHTML, /考试结果/);
  assert.match(reloadEnv.appElement.innerHTML, /得分：1 \/ 2/);
});

test('existing practice session survives exam submission and reload', async () => {
  let selectedAnswers = ['A'];
  const storage = createMutableStorage({
    'question-app.preferences': { practiceMode: 'random' },
    'question-app.progress': { 2: { correct: false, selectedAnswer: ['D'] } },
    'question-app.current-practice': { mode: 'random', order: [2, 1], currentIndex: 0 },
  });
  const env = setupAppEnvironment('#/exam', {
    querySelectorAllImpl(selector) {
      if (selector === 'input[name="answer"]:checked') {
        return selectedAnswers.map((value) => ({ value }));
      }
      return null;
    },
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-next' } }
          : null;
      },
    },
  });

  selectedAnswers = ['C'];
  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-submit' } }
          : null;
      },
    },
  });

  cleanupAppEnvironment();

  const reloadEnv = setupAppEnvironment('#/practice');
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const reloadedApp = await loadAppModule();
  await reloadedApp.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(reloadEnv.appElement.innerHTML, /Question 2/);
  assert.match(reloadEnv.appElement.innerHTML, /回答错误/);
  assert.match(reloadEnv.appElement.innerHTML, /value="D"[\s\S]*checked/);
});

test('retry wrong questions starts a focused practice session from the results screen', async () => {
  let selectedAnswers = ['A'];
  const storage = createMutableStorage();
  const env = setupAppEnvironment('#/exam', {
    querySelectorAllImpl(selector) {
      if (selector === 'input[name="answer"]:checked') {
        return selectedAnswers.map((value) => ({ value }));
      }
      return null;
    },
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-next' } }
          : null;
      },
    },
  });

  selectedAnswers = ['D'];
  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-submit' } }
          : null;
      },
    },
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'retry-wrong-questions' } }
          : null;
      },
    },
  });

  assert.equal(window.location.hash, '#/practice');
  assert.match(env.appElement.innerHTML, /Question 2/);
  assert.doesNotMatch(env.appElement.innerHTML, /鍥炵瓟/);
  assert.deepEqual(storage.dump()['question-app.current-practice'], {
    zh: {
      mode: 'sequential',
      order: [2],
      currentIndex: 0,
    },
    en: null,
  });
});

test('restart exam replaces any saved in-progress exam with a clean session', async () => {
  const storage = createMutableStorage({
    'question-app.exam-history': [{ score: 1, total: 2, wrongIds: [2], durationSeconds: 3 }],
    'question-app.current-exam': {
      order: [1, 2],
      answers: { 1: ['A'] },
      currentIndex: 1,
      startedAt: 5,
    },
  });
  const env = setupAppEnvironment('#/results');
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'restart-exam' } }
          : null;
      },
    },
  });

  assert.equal(window.location.hash, '#/exam');
  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.match(env.appElement.innerHTML, /0 \/ 2/);
  assert.doesNotMatch(env.appElement.innerHTML, /checked/);

  const persistedExam = storage.dump()['question-app.current-exam'].zh;
  assert.deepEqual(persistedExam.order, [1, 2]);
  assert.deepEqual(persistedExam.answers, {});
  assert.equal(persistedExam.currentIndex, 0);
});

test('blank exam navigation does not count a question as answered and exam resumes after reload', async () => {
  const storage = createMutableStorage();
  const env = setupAppEnvironment('#/exam', {
    querySelectorAllImpl(selector) {
      if (selector === 'input[name="answer"]:checked') {
        return [];
      }
      return null;
    },
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'exam-next' } }
          : null;
      },
    },
  });

  assert.match(env.appElement.innerHTML, /0 \/ 2/);
  assert.deepEqual(storage.dump()['question-app.current-exam']?.zh?.answers, {});

  cleanupAppEnvironment();

  const reloadEnv = setupAppEnvironment('#/exam');
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const reloadedApp = await loadAppModule();
  await reloadedApp.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(reloadEnv.appElement.innerHTML, /Question 2/);
  assert.match(reloadEnv.appElement.innerHTML, /0 \/ 2/);
});

test('render updates active nav classes after hashchange', async () => {
  const env = setupAppEnvironment();
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  await loadAppModule();
  assert.equal(env.buttons[0].classList.contains('is-active'), true);

  window.location.hash = '#/mistakes';
  env.listeners.hashchange();

  assert.equal(env.buttons[0].classList.contains('is-active'), false);
  assert.equal(env.buttons[3].classList.contains('is-active'), true);
});

test('mistakes route renders notebook entries from persisted state', async () => {
  const env = setupAppEnvironment('#/mistakes');
  const storage = createMutableStorage({
    'question-app.mistakes': [2, 1],
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(env.appElement.innerHTML, /Question 2/);
  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.match(env.appElement.innerHTML, /data-action="retry-mistakes"/);
  assert.match(env.appElement.innerHTML, /data-action="remove-mistake" data-question-id="2"/);
});

test('retrying mistakes from the notebook starts a focused practice session', async () => {
  const env = setupAppEnvironment('#/mistakes');
  const storage = createMutableStorage({
    'question-app.mistakes': [2, 1],
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'retry-mistakes' } }
          : null;
      },
    },
  });

  assert.equal(window.location.hash, '#/practice');
  assert.match(env.appElement.innerHTML, /Question 2/);
  assert.deepEqual(storage.dump()['question-app.current-practice'], {
    zh: {
      mode: 'sequential',
      order: [2, 1],
      currentIndex: 0,
    },
    en: null,
  });
});

test('retrying mistakes ignores stale and duplicate persisted ids', async () => {
  const env = setupAppEnvironment('#/mistakes');
  const storage = createMutableStorage({
    'question-app.mistakes': [999, 1, 1],
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.doesNotMatch(env.appElement.innerHTML, /Question 2/);
  assert.doesNotMatch(env.appElement.innerHTML, /#999/);

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'retry-mistakes' } }
          : null;
      },
    },
  });

  assert.equal(window.location.hash, '#/practice');
  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.deepEqual(storage.dump()['question-app.current-practice'], {
    zh: {
      mode: 'sequential',
      order: [1],
      currentIndex: 0,
    },
    en: null,
  });
});

test('removing a mistake updates persisted notebook state and the rendered list', async () => {
  const env = setupAppEnvironment('#/mistakes');
  const storage = createMutableStorage({
    'question-app.mistakes': [2, 1],
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'remove-mistake', questionId: '2' } }
          : null;
      },
    },
  });

  assert.doesNotMatch(env.appElement.innerHTML, /Question 2/);
  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.deepEqual(storage.dump()['question-app.mistakes'], { zh: [1], en: [] });
});

test('removing the last mistake shows the empty notebook state', async () => {
  const env = setupAppEnvironment('#/mistakes');
  const storage = createMutableStorage({
    'question-app.mistakes': [1],
  });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.click({
    target: {
      closest(selector) {
        return selector === '[data-action]'
          ? { dataset: { action: 'remove-mistake', questionId: '1' } }
          : null;
      },
    },
  });

  assert.match(env.appElement.innerHTML, /data-empty-state="mistakes"/);
  assert.deepEqual(storage.dump()['question-app.mistakes'], { zh: [], en: [] });
});

test('practice view responds to ArrowRight and ArrowLeft keyboard navigation', async () => {
  const storage = createMutableStorage({
    'question-app.preferences': { practiceMode: 'sequential' },
  });
  const env = setupAppEnvironment('#/practice');
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.equal(typeof env.listeners.keydown, 'function');

  env.listeners.keydown({ key: 'ArrowRight', target: null });
  assert.match(env.appElement.innerHTML, /Question 2/);
  assert.equal(storage.dump()['question-app.current-practice']?.zh?.currentIndex, 1);

  env.listeners.keydown({ key: 'ArrowLeft', target: null });
  assert.match(env.appElement.innerHTML, /Question 1/);
  assert.equal(storage.dump()['question-app.current-practice']?.zh?.currentIndex, 0);
});

test('practice keyboard navigation ignores typing targets, modifiers, and non-practice routes', async () => {
  const storage = createMutableStorage({
    'question-app.preferences': { practiceMode: 'sequential' },
  });
  const env = setupAppEnvironment('#/practice');
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  env.listeners.keydown({ key: 'ArrowRight', target: { tagName: 'INPUT' } });
  assert.match(env.appElement.innerHTML, /Question 1/);

  env.listeners.keydown({ key: 'ArrowRight', ctrlKey: true, target: null });
  assert.match(env.appElement.innerHTML, /Question 1/);

  window.location.hash = '#/mistakes';
  env.listeners.keydown({ key: 'ArrowRight', target: null });
  assert.doesNotMatch(env.appElement.innerHTML, /Question 2/);
});

test('bootstrapApp does not stack duplicate listeners on repeated bootstraps', async () => {
  const storage = createMutableStorage({
    'question-app.preferences': { practiceMode: 'sequential' },
  });
  const env = setupAppEnvironment('#/practice');
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => sampleQuestions,
  });

  const app = await loadAppModule();
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });
  await app.bootstrapApp({
    fetch: globalThis.fetch,
    storage,
    window: globalThis.window,
    document: globalThis.document,
  });

  assert.equal(env.listenerCounts.click, 1);
  assert.equal(env.listenerCounts.keydown, 1);
  assert.equal(env.listenerCounts.hashchange, 1);

  env.dispatchDocument('keydown', { key: 'ArrowRight', target: null });
  assert.equal(storage.dump()['question-app.current-practice']?.zh?.currentIndex, 1);
});
