import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EXAM_SIZE,
  createExamSession,
  gradeExamSession,
  restoreExamSession,
  snapshotExamSession,
} from '../../src/exam.js';

const questions = [
  { id: 1, answer: ['A'] },
  { id: 2, answer: ['B'] },
  { id: 3, answer: ['C'] },
];

test('createExamSession trims to the requested size', () => {
  const session = createExamSession(questions, 2);
  assert.equal(session.order.length, 2);
});

test('createExamSession defaults to a randomized 90-question exam', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const largeQuestionSet = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      answer: ['A'],
    }));
    const session = createExamSession(largeQuestionSet);

    assert.equal(session.order.length, DEFAULT_EXAM_SIZE);
    assert.notDeepEqual(
      session.order,
      largeQuestionSet.slice(0, DEFAULT_EXAM_SIZE).map((question) => question.id),
    );
  } finally {
    Math.random = originalRandom;
  }
});

test('gradeExamSession counts correct answers', () => {
  const session = {
    order: [1, 2],
    answers: { 1: ['A'], 2: ['C'] },
    startedAt: 0,
  };
  const result = gradeExamSession(session, questions);
  assert.equal(result.score, 1);
  assert.equal(result.total, 2);
  assert.deepEqual(result.wrongIds, [2]);
});

test('snapshotExamSession omits unanswered entries', () => {
  const snapshot = snapshotExamSession({
    order: [1, 2],
    answers: { 1: ['A'], 2: [] },
    currentIndex: 1,
    startedAt: 10,
  });

  assert.deepEqual(snapshot, {
    order: [1, 2],
    answers: { 1: ['A'] },
    currentIndex: 1,
    startedAt: 10,
  });
});

test('restoreExamSession clamps index and drops invalid saved answers', () => {
  const session = restoreExamSession(
    questions,
    {
      order: [1, 2, 99],
      answers: { 1: ['A'], 2: [], 99: ['Z'] },
      currentIndex: 10,
      startedAt: 5,
    },
    2,
  );

  assert.deepEqual(session.order, [1, 2]);
  assert.deepEqual(session.answers, { 1: ['A'] });
  assert.equal(session.currentIndex, 1);
  assert.equal(session.startedAt, 5);
});
