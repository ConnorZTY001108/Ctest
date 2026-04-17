const BANK_IDS = ['zh', 'en'];
const DEFAULT_BANK_ID = 'zh';

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asPracticeSession(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function asExamSession(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function hasBankBuckets(value) {
  const candidate = asObject(value);
  return BANK_IDS.some((bankId) => Object.hasOwn(candidate, bankId));
}

function normalizeBankId(value) {
  return BANK_IDS.includes(value) ? value : DEFAULT_BANK_ID;
}

function normalizeBankBuckets(value, normalizeValue) {
  if (hasBankBuckets(value)) {
    const bucket = asObject(value);
    return Object.fromEntries(
      BANK_IDS.map((bankId) => [bankId, normalizeValue(bucket[bankId])]),
    );
  }

  return {
    [DEFAULT_BANK_ID]: normalizeValue(value),
    en: normalizeValue(undefined),
  };
}

function normalizeProgressEntries(questions, value) {
  const validQuestionIds = new Set(questions.map((question) => String(question.id)));
  return Object.fromEntries(
    Object.entries(asObject(value)).filter(([questionId]) => validQuestionIds.has(questionId)),
  );
}

function normalizeMistakes(questions, value) {
  const validQuestionIds = new Set(questions.map((question) => question.id));
  const seen = new Set();

  return asArray(value).filter((questionId) => {
    if (!validQuestionIds.has(questionId) || seen.has(questionId)) {
      return false;
    }

    seen.add(questionId);
    return true;
  });
}

function selectActiveBuckets(questions, preferences, persisted) {
  const bankId = normalizeBankId(preferences.activeBankId);
  const progressByBank = normalizeBankBuckets(persisted.progress, asObject);
  const mistakesByBank = normalizeBankBuckets(persisted.mistakes, asArray);
  const examHistoryByBank = normalizeBankBuckets(persisted.examHistory, asArray);
  const currentPracticeByBank = normalizeBankBuckets(persisted.currentPractice, asPracticeSession);
  const currentExamByBank = normalizeBankBuckets(persisted.currentExam, asExamSession);

  progressByBank[bankId] = normalizeProgressEntries(questions, progressByBank[bankId]);
  mistakesByBank[bankId] = normalizeMistakes(questions, mistakesByBank[bankId]);

  return {
    bankId,
    progressByBank,
    mistakesByBank,
    examHistoryByBank,
    currentPracticeByBank,
    currentExamByBank,
    progress: progressByBank[bankId],
    mistakes: mistakesByBank[bankId],
    examHistory: examHistoryByBank[bankId],
    currentPractice: currentPracticeByBank[bankId],
    currentExam: currentExamByBank[bankId],
  };
}

export function setActiveBank(state, questions, bankId) {
  const nextBankId = normalizeBankId(bankId);

  state.questions = questions;
  state.bankId = nextBankId;
  state.preferences.activeBankId = nextBankId;
  state.progressByBank[nextBankId] = normalizeProgressEntries(questions, state.progressByBank[nextBankId]);
  state.mistakesByBank[nextBankId] = normalizeMistakes(questions, state.mistakesByBank[nextBankId]);
  state.examHistoryByBank[nextBankId] = asArray(state.examHistoryByBank[nextBankId]);
  state.currentPracticeByBank[nextBankId] = asPracticeSession(state.currentPracticeByBank[nextBankId]);
  state.currentExamByBank[nextBankId] = asExamSession(state.currentExamByBank[nextBankId]);
  state.progress = state.progressByBank[nextBankId];
  state.mistakes = state.mistakesByBank[nextBankId];
  state.examHistory = state.examHistoryByBank[nextBankId];
  state.currentPractice = state.currentPracticeByBank[nextBankId];
  state.currentExam = state.currentExamByBank[nextBankId];
  state.lastResult = state.examHistory[0] ?? null;
  return state;
}

export function createInitialState(questions, persisted = {}) {
  const preferences = {
    practiceMode: 'sequential',
    activeBankId: DEFAULT_BANK_ID,
    ...asObject(persisted.preferences),
  };

  const activeBuckets = selectActiveBuckets(questions, preferences, persisted);
  preferences.activeBankId = activeBuckets.bankId;

  return {
    questions,
    preferences,
    bankId: activeBuckets.bankId,
    progressByBank: activeBuckets.progressByBank,
    mistakesByBank: activeBuckets.mistakesByBank,
    examHistoryByBank: activeBuckets.examHistoryByBank,
    currentPracticeByBank: activeBuckets.currentPracticeByBank,
    currentExamByBank: activeBuckets.currentExamByBank,
    progress: activeBuckets.progress,
    mistakes: activeBuckets.mistakes,
    examHistory: activeBuckets.examHistory,
    currentPractice: activeBuckets.currentPractice,
    currentExam: activeBuckets.currentExam,
    lastResult: null,
  };
}

export function getDashboardStats(state) {
  const answeredEntries = Object.values(state.progress);
  const answeredCount = answeredEntries.length;
  const correctCount = answeredEntries.filter((entry) => entry.correct).length;
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const lastExam = state.examHistory[0];

  return {
    totalQuestions: state.questions.length,
    answeredCount,
    accuracy,
    mistakeCount: state.mistakes.length,
    lastExamScore: lastExam ? `${lastExam.score} / ${lastExam.total}` : '暂无',
  };
}

export { BANK_IDS, DEFAULT_BANK_ID };
