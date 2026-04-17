export const DEFAULT_EXAM_SIZE = 20;

function normalizeOrder(questions, order, size = DEFAULT_EXAM_SIZE) {
  const validIds = new Set(questions.map((question) => question.id));
  const fallbackOrder = questions.slice(0, size).map((question) => question.id);
  const persistedOrder = Array.isArray(order)
    ? order.filter((questionId) => validIds.has(questionId))
    : [];

  return persistedOrder.length ? persistedOrder : fallbackOrder;
}

function normalizeAnswers(answers, validOrder) {
  const validIds = new Set(validOrder);

  return Object.fromEntries(
    Object.entries(answers ?? {})
      .filter(([questionId, answer]) => validIds.has(Number(questionId)) && Array.isArray(answer) && answer.length)
      .map(([questionId, answer]) => [questionId, [...answer]]),
  );
}

export function createExamSession(questions, size = DEFAULT_EXAM_SIZE) {
  const order = normalizeOrder(questions, null, size);
  return {
    order,
    answers: {},
    currentIndex: 0,
    startedAt: Date.now(),
  };
}

export function snapshotExamSession(session) {
  if (!session) return null;

  return {
    order: [...session.order],
    answers: normalizeAnswers(session.answers, session.order),
    currentIndex: session.currentIndex,
    startedAt: session.startedAt,
  };
}

export function restoreExamSession(questions, persistedSession, size = DEFAULT_EXAM_SIZE) {
  const order = normalizeOrder(questions, persistedSession?.order, size);
  const maxIndex = Math.max(order.length - 1, 0);
  const currentIndex = Number.isInteger(persistedSession?.currentIndex)
    ? Math.min(Math.max(persistedSession.currentIndex, 0), maxIndex)
    : 0;

  return {
    order,
    answers: normalizeAnswers(persistedSession?.answers, order),
    currentIndex,
    startedAt: Number.isFinite(persistedSession?.startedAt) ? persistedSession.startedAt : Date.now(),
  };
}

export function gradeExamSession(session, questions) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  let score = 0;
  const wrongIds = [];

  for (const id of session.order) {
    const selected = [...(session.answers[id] || [])].sort();
    const expected = [...questionMap.get(id).answer].sort();

    if (selected.join('|') === expected.join('|')) {
      score += 1;
    } else {
      wrongIds.push(id);
    }
  }

  return {
    score,
    total: session.order.length,
    wrongIds,
    durationSeconds: Math.round((Date.now() - session.startedAt) / 1000),
  };
}
