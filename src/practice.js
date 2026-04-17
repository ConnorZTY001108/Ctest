function shuffleIds(ids) {
  const copy = [...ids];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }
  return copy;
}

function hydrateProgress(session, questions, progress = {}) {
  session.order.forEach((questionId) => {
    const progressEntry = progress[questionId];
    if (!progressEntry || !Array.isArray(progressEntry.selectedAnswer)) return;

    session.answers[questionId] = [...progressEntry.selectedAnswer];
    session.feedback[questionId] = gradePracticeAnswer(
      questions.find((question) => question.id === questionId),
      progressEntry.selectedAnswer,
    );
  });

  return session;
}

export function createPracticeSession(questions, mode = 'sequential') {
  const ids = questions.map((question) => question.id);
  return {
    mode,
    order: mode === 'random' ? shuffleIds(ids) : ids,
    currentIndex: 0,
    answers: {},
    feedback: {},
  };
}

export function restorePracticeSession(questions, persistedSession, progress = {}) {
  const ids = questions.map((question) => question.id);
  const validOrder = Array.isArray(persistedSession?.order)
    ? persistedSession.order.filter((questionId) => ids.includes(questionId))
    : [];

  if (!validOrder.length) {
    return hydrateProgress(
      createPracticeSession(questions, persistedSession?.mode ?? 'sequential'),
      questions,
      progress,
    );
  }

  const maxIndex = validOrder.length - 1;
  const currentIndex = Number.isInteger(persistedSession?.currentIndex)
    ? Math.min(Math.max(persistedSession.currentIndex, 0), maxIndex)
    : 0;
  const session = {
    mode: persistedSession?.mode === 'random' ? 'random' : 'sequential',
    order: validOrder,
    currentIndex,
    answers: {},
    feedback: {},
  };

  return hydrateProgress(session, questions, progress);
}

export function snapshotPracticeSession(session) {
  if (!session) return null;
  return {
    mode: session.mode,
    order: [...session.order],
    currentIndex: session.currentIndex,
  };
}

export function gradePracticeAnswer(question, selectedKeys) {
  const normalized = [...selectedKeys].sort();
  const expected = [...question.answer].sort();
  return {
    correct: normalized.join('|') === expected.join('|'),
    selectedAnswer: normalized,
    correctAnswer: expected,
  };
}
