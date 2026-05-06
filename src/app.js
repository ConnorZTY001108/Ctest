import { getRouteLabel, navigate, normalizeRoute } from './router.js';
import { createStorageApi, DEFAULT_KEYS } from './storage.js';
import { createInitialState, DEFAULT_BANK_ID, getDashboardStats, setActiveBank } from './state.js';
import {
  createPracticeSession,
  gradePracticeAnswer,
  restorePracticeSession,
  snapshotPracticeSession,
} from './practice.js';
import {
  DEFAULT_EXAM_SIZE,
  createExamSession,
  gradeExamSession,
  restoreExamSession,
  snapshotExamSession,
} from './exam.js';
import { createArchivePayload, createLearningArchiveService } from './learning-archive.js';
import { applyStoredCore2Analyses, decorateCore2Questions } from './core2-analysis.js';
import { sanitizeQuestionBankData } from './question-bank-sanitizer.js';
import { renderHomeView } from './views/home-view.js';
import { renderExamView } from './views/exam-view.js';
import { renderMistakesView } from './views/mistakes-view.js';
import { renderPracticeView } from './views/practice-view.js';
import { renderResultsView } from './views/results-view.js';

const QUESTION_BANKS = [
  { id: 'zh', label: '中文题库', file: './data/questions.zh.json' },
  { id: 'en', label: 'English Question Bank', file: './data/questions.en.json' },
  {
    id: 'core2',
    label: 'core2',
    file: './data/questions.core2.json',
    analysisFiles: [
      './data/questions.core2.analysis.json',
      './data/questions.core2.curated.analysis.json',
    ],
  },
  { id: 'awsSaa', label: 'AWS SAA Screenshots', file: './data/questions.aws-saa.json' },
];
const QUESTION_BANK_MAP = new Map(QUESTION_BANKS.map((bank) => [bank.id, bank]));

let state = null;
let storageApi = null;
let fetchApi = null;
let archiveService = null;
let appWindow = null;
let appDocument = null;
let archiveSyncQueue = Promise.resolve();
const questionBankCache = new Map();
const boundDocuments = new WeakSet();
const boundWindows = new WeakSet();

function renderPlaceholder(route) {
  return `
    <section class="panel" style="padding: 28px">
      <h2>${getRouteLabel(route)}</h2>
      <p>页面骨架已启动，后续任务会填充具体内容。</p>
    </section>
  `;
}

function getQuestionBank(bankId) {
  return QUESTION_BANK_MAP.get(bankId) ?? QUESTION_BANK_MAP.get(DEFAULT_BANK_ID);
}

function getActiveBankLabel() {
  return getQuestionBank(state?.bankId).label;
}

function updateArchiveStatus() {
  if (!state || !archiveService?.getStatus) return;
  state.archiveStatus = archiveService.getStatus();
}

function createLearningArchiveSnapshot() {
  return createArchivePayload(state, QUESTION_BANKS);
}

function queueArchiveSync() {
  updateArchiveStatus();
  if (!state?.archiveStatus?.bound || !archiveService?.sync) return;

  archiveSyncQueue = archiveSyncQueue
    .then(async () => {
      await archiveService.sync(createLearningArchiveSnapshot());
      updateArchiveStatus();
      if (appWindow && appDocument && normalizeRoute(appWindow.location.hash) === 'mistakes') {
        renderApp(appWindow, appDocument);
      }
    })
    .catch(() => {
      updateArchiveStatus();
      if (appWindow && appDocument && normalizeRoute(appWindow.location.hash) === 'mistakes') {
        renderApp(appWindow, appDocument);
      }
    });
}

async function bindLearningArchive(windowObject, documentObject) {
  if (!archiveService?.bindFile) return;

  await archiveService.bindFile();
  updateArchiveStatus();

  if (state?.archiveStatus?.bound && archiveService?.sync) {
    await archiveService.sync(createLearningArchiveSnapshot());
    updateArchiveStatus();
  }

  renderApp(windowObject, documentObject);
}

function hydrateActiveSessions() {
  if (state.currentPractice) {
    state.currentPractice = restorePracticeSession(
      state.questions,
      state.currentPractice,
      state.progress,
    );
  }

  if (state.currentExam) {
    state.currentExam = restoreExamSession(state.questions, state.currentExam, DEFAULT_EXAM_SIZE);
  }

  state.currentPracticeByBank[state.bankId] = snapshotPracticeSession(state.currentPractice);
  state.currentExamByBank[state.bankId] = snapshotExamSession(state.currentExam);
  state.lastResult = state.examHistory[0] ?? null;
}

function getQuestionById(questionId) {
  return state.questions.find((question) => question.id === questionId);
}

function getMistakeQuestions() {
  return state.mistakes
    .map((questionId) => getQuestionById(questionId))
    .filter(Boolean);
}

function getMistakeQuestionIds() {
  return getMistakeQuestions().map((question) => question.id);
}

function persistState() {
  if (!storageApi || !state) return;

  state.progressByBank[state.bankId] = state.progress;
  state.mistakesByBank[state.bankId] = state.mistakes;
  state.examHistoryByBank[state.bankId] = state.examHistory;
  state.currentPracticeByBank[state.bankId] = snapshotPracticeSession(state.currentPractice);
  state.currentExamByBank[state.bankId] = snapshotExamSession(state.currentExam);

  storageApi.set(DEFAULT_KEYS.progress, state.progressByBank);
  storageApi.set(DEFAULT_KEYS.mistakes, state.mistakesByBank);
  storageApi.set(DEFAULT_KEYS.examHistory, state.examHistoryByBank);
  storageApi.set(DEFAULT_KEYS.preferences, state.preferences);
  storageApi.set(DEFAULT_KEYS.currentPractice, state.currentPracticeByBank);
  storageApi.set(DEFAULT_KEYS.currentExam, state.currentExamByBank);
  queueArchiveSync();
}

function ensurePracticeSession() {
  if (!state.currentPractice) {
    state.currentPractice = createPracticeSession(state.questions, state.preferences.practiceMode);
  }
}

function ensureExamSession() {
  if (!state.currentExam) {
    state.currentExam = createExamSession(state.questions, DEFAULT_EXAM_SIZE);
    return true;
  }

  return false;
}

function getSelectedAnswers(documentObject) {
  return [...documentObject.querySelectorAll('input[name="answer"]:checked')]
    .map((input) => input.value);
}

function saveCurrentExamAnswer(documentObject) {
  if (!state.currentExam?.order.length) return;
  const currentId = state.currentExam.order[state.currentExam.currentIndex];
  const selectedAnswers = getSelectedAnswers(documentObject);

  if (selectedAnswers.length) {
    state.currentExam.answers[currentId] = selectedAnswers;
  } else {
    delete state.currentExam.answers[currentId];
  }
}

function createRetrySession(wrongIds) {
  return {
    mode: 'sequential',
    order: [...wrongIds],
    currentIndex: 0,
    hydrateFromProgress: false,
    answers: {},
    feedback: {},
  };
}

function recordExamResult(result) {
  state.lastResult = result;
  state.examHistory.unshift(result);

  for (const questionId of result.wrongIds) {
    if (!state.mistakes.includes(questionId)) {
      state.mistakes.unshift(questionId);
    }
  }
}

function movePracticeIndex(offset) {
  ensurePracticeSession();
  const lastIndex = state.currentPractice.order.length - 1;
  state.currentPractice.currentIndex = Math.max(
    0,
    Math.min(lastIndex, state.currentPractice.currentIndex + offset),
  );
}

function removeMistake(questionId) {
  state.mistakes = state.mistakes.filter((id) => id !== questionId);
}

function renderPractice() {
  ensurePracticeSession();

  if (!state.currentPractice.order.length) {
    return `
      <section class="panel" style="padding: 28px">
        <h2>练习</h2>
        <p>当前没有可用题目。</p>
      </section>
    `;
  }

  const currentId = state.currentPractice.order[state.currentPractice.currentIndex];
  const question = getQuestionById(currentId);
  const feedback = state.currentPractice.feedback[currentId];
  const selectedAnswer = state.currentPractice.answers[currentId] ?? [];

  return renderPracticeView(
    question,
    state.currentPractice,
    feedback,
    selectedAnswer,
    getActiveBankLabel(),
  );
}

function renderExam() {
  if (ensureExamSession()) {
    persistState();
  }

  if (!state.currentExam.order.length) {
    return `
      <section class="panel" style="padding: 28px">
        <h2>模拟考试</h2>
        <p>当前没有可用题目。</p>
      </section>
    `;
  }

  const currentId = state.currentExam.order[state.currentExam.currentIndex];
  const question = getQuestionById(currentId);
  const selectedAnswer = state.currentExam.answers[currentId] ?? [];

  return renderExamView(question, state.currentExam, selectedAnswer, getActiveBankLabel());
}

function renderResults() {
  if (!state.lastResult) {
    return `
      <section class="panel" style="padding: 28px">
        <h2>考试结果</h2>
        <p>暂时还没有考试记录。</p>
      </section>
    `;
  }

  const questionMap = new Map(state.questions.map((question) => [question.id, question]));
  return renderResultsView(state.lastResult, questionMap, getActiveBankLabel());
}

function renderMistakes() {
  return renderMistakesView(
    getMistakeQuestions(),
    getActiveBankLabel(),
    state.archiveStatus,
    state.preferences.autoRemoveCorrectMistakes !== false,
  );
}

function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || target.isContentEditable === true;
}

function renderApp(windowObject, documentObject) {
  const route = normalizeRoute(windowObject.location.hash);
  const app = documentObject.querySelector('#app');

  if (route === 'home') {
    app.innerHTML = renderHomeView({
      stats: getDashboardStats(state),
      banks: QUESTION_BANKS,
      activeBankId: state.bankId,
    });
  } else if (route === 'practice') {
    app.innerHTML = renderPractice();
  } else if (route === 'exam') {
    app.innerHTML = renderExam();
  } else if (route === 'mistakes') {
    app.innerHTML = renderMistakes();
  } else if (route === 'results') {
    app.innerHTML = renderResults();
  } else {
    app.innerHTML = renderPlaceholder(route);
  }

  documentObject.querySelectorAll('[data-route]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.route === route);
  });
}

function renderFailure(documentObject, error) {
  const app = documentObject.querySelector('#app');
  if (!app) return;
  app.innerHTML = `<section class="panel" style="padding: 28px"><h2>题库加载失败</h2><p>${error.message}</p></section>`;
}

async function loadQuestions(fetchImpl, bankId = DEFAULT_BANK_ID) {
  const bank = getQuestionBank(bankId);
  if (questionBankCache.has(bank.id)) {
    return questionBankCache.get(bank.id);
  }

  const response = await fetchImpl(bank.file);
  if (!response.ok) throw new Error('题库加载失败');
  const questions = sanitizeQuestionBankData(await response.json());
  let hydratedQuestions = questions;

  if (bank.id === 'core2') {
    if (bank.analysisFiles?.length) {
      const analysisRecords = [];

      for (const analysisFile of bank.analysisFiles) {
        const analysisResponse = await fetchImpl(analysisFile);
        if (!analysisResponse.ok) throw new Error('题库解析加载失败');
        const records = sanitizeQuestionBankData(await analysisResponse.json());
        analysisRecords.push(...records);
      }

      hydratedQuestions = applyStoredCore2Analyses(questions, analysisRecords);
    } else {
      hydratedQuestions = decorateCore2Questions(questions);
    }
  }

  hydratedQuestions = sanitizeQuestionBankData(hydratedQuestions);
  questionBankCache.set(bank.id, hydratedQuestions);
  return hydratedQuestions;
}

async function switchQuestionBank(bankId, windowObject, documentObject) {
  const nextBank = getQuestionBank(bankId);
  if (!state || nextBank.id === state.bankId) return;

  persistState();
  const questions = await loadQuestions(fetchApi, nextBank.id);
  setActiveBank(state, questions, nextBank.id);
  state.currentPractice = null;
  state.currentExam = null;
  state.currentPracticeByBank[state.bankId] = null;
  state.currentExamByBank[state.bankId] = null;
  state.lastResult = state.examHistory[0] ?? null;
  persistState();
  navigate('home');
  renderApp(windowObject, documentObject);
}

function ensureEventBindings(windowObject, documentObject) {
  if (!boundDocuments.has(documentObject)) {
    documentObject.addEventListener('click', async (event) => {
      const startPracticeButton = event.target.closest('[data-action="start-practice"]');
      if (startPracticeButton?.dataset.action === 'start-practice') {
        state.preferences.practiceMode = startPracticeButton.dataset.mode || 'sequential';
        state.currentPractice = createPracticeSession(state.questions, state.preferences.practiceMode);
        persistState();
        navigate('practice');
        return;
      }

      const actionButton = event.target.closest('[data-action]');
      const action = actionButton?.dataset.action;
      if (action === 'select-bank') {
        try {
          await switchQuestionBank(actionButton.dataset.bankId, windowObject, documentObject);
        } catch (error) {
          renderFailure(documentObject, error);
        }
        return;
      }

      if (action === 'bind-learning-archive') {
        try {
          await bindLearningArchive(windowObject, documentObject);
        } catch (error) {
          renderFailure(documentObject, error);
        }
        return;
      }

      if (action === 'toggle-auto-remove-mistakes') {
        state.preferences.autoRemoveCorrectMistakes = state.preferences.autoRemoveCorrectMistakes === false;
        persistState();
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'start-exam') {
        state.currentExam = createExamSession(state.questions, DEFAULT_EXAM_SIZE);
        persistState();
        navigate('exam');
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'practice-submit') {
        ensurePracticeSession();
        const currentId = state.currentPractice.order[state.currentPractice.currentIndex];
        const question = getQuestionById(currentId);
        const selected = getSelectedAnswers(documentObject);
        const result = gradePracticeAnswer(question, selected);

        state.currentPractice.answers[currentId] = selected;
        state.currentPractice.feedback[currentId] = result;
        state.progress[currentId] = { correct: result.correct, selectedAnswer: selected };

        if (!result.correct && !state.mistakes.includes(currentId)) {
          state.mistakes.unshift(currentId);
        } else if (result.correct && state.preferences.autoRemoveCorrectMistakes !== false) {
          removeMistake(currentId);
        }

        persistState();
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'practice-prev') {
        movePracticeIndex(-1);
        persistState();
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'practice-next') {
        movePracticeIndex(1);
        persistState();
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'exam-prev') {
        ensureExamSession();
        saveCurrentExamAnswer(documentObject);
        state.currentExam.currentIndex = Math.max(0, state.currentExam.currentIndex - 1);
        persistState();
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'exam-next') {
        ensureExamSession();
        saveCurrentExamAnswer(documentObject);
        const lastIndex = state.currentExam.order.length - 1;
        state.currentExam.currentIndex = Math.min(lastIndex, state.currentExam.currentIndex + 1);
        persistState();
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'exam-submit') {
        ensureExamSession();
        saveCurrentExamAnswer(documentObject);
        const result = gradeExamSession(state.currentExam, state.questions);
        recordExamResult(result);
        state.currentExam = null;
        persistState();
        navigate('results');
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'retry-wrong-questions') {
        if (!state.lastResult?.wrongIds.length) return;
        state.currentPractice = createRetrySession(state.lastResult.wrongIds);
        persistState();
        navigate('practice');
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'restart-exam') {
        state.currentExam = createExamSession(state.questions, DEFAULT_EXAM_SIZE);
        persistState();
        navigate('exam');
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'retry-mistakes') {
        const mistakeIds = getMistakeQuestionIds();
        if (!mistakeIds.length) return;
        state.currentPractice = createRetrySession(mistakeIds);
        persistState();
        navigate('practice');
        renderApp(windowObject, documentObject);
        return;
      }

      if (action === 'remove-mistake') {
        const questionId = Number(actionButton.dataset.questionId);
        if (!Number.isFinite(questionId)) return;
        removeMistake(questionId);
        persistState();
        renderApp(windowObject, documentObject);
        return;
      }

      const button = event.target.closest('[data-route]');
      if (!button) return;
      navigate(button.dataset.route);
    });

    documentObject.addEventListener('keydown', (event) => {
      if (normalizeRoute(windowObject.location.hash) !== 'practice') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      movePracticeIndex(event.key === 'ArrowRight' ? 1 : -1);
      persistState();
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      renderApp(windowObject, documentObject);
    });

    boundDocuments.add(documentObject);
  }

  if (!boundWindows.has(windowObject)) {
    windowObject.addEventListener('hashchange', () => {
      renderApp(windowObject, documentObject);
    });

    boundWindows.add(windowObject);
  }
}

function readPersistedState(storage) {
  return {
    progress: storage.get(DEFAULT_KEYS.progress, {}),
    mistakes: storage.get(DEFAULT_KEYS.mistakes, []),
    examHistory: storage.get(DEFAULT_KEYS.examHistory, []),
    preferences: storage.get(DEFAULT_KEYS.preferences, { practiceMode: 'sequential' }),
    currentPractice: storage.get(DEFAULT_KEYS.currentPractice, null),
    currentExam: storage.get(DEFAULT_KEYS.currentExam, null),
  };
}

export async function bootstrapApp({
  fetch: fetchImpl = globalThis.fetch,
  storage = createStorageApi(),
  window: windowObject = globalThis.window,
  document: documentObject = globalThis.document,
  archive = createLearningArchiveService({ windowObject }),
} = {}) {
  try {
    appWindow = windowObject;
    appDocument = documentObject;
    fetchApi = fetchImpl;
    const persisted = readPersistedState(storage);
    const preferredBankId = persisted.preferences?.activeBankId ?? DEFAULT_BANK_ID;
    const questions = await loadQuestions(fetchImpl, preferredBankId);
    storageApi = storage;
    archiveService = archive;
    state = createInitialState(questions, persisted);
    state.archiveStatus = archiveService?.initialize
      ? await archiveService.initialize()
      : {
        supported: false,
        bound: false,
        fileName: '',
        syncState: 'unsupported',
        lastSyncedAt: null,
        message: '当前浏览器不支持本地文件自动同步。',
      };
    hydrateActiveSessions();
    ensureEventBindings(windowObject, documentObject);

    renderApp(windowObject, documentObject);
    return state;
  } catch (error) {
    renderFailure(documentObject, error);
    return null;
  }
}

await bootstrapApp();
