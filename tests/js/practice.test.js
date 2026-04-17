import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPracticeSession,
  gradePracticeAnswer,
  restorePracticeSession,
} from '../../src/practice.js';

const sampleQuestions = [
  { id: 1, answer: ['A'], options: [{ key: 'A' }, { key: 'B' }] },
  { id: 2, answer: ['C'], options: [{ key: 'C' }, { key: 'D' }] },
];

test('createPracticeSession preserves sequential order', () => {
  const session = createPracticeSession(sampleQuestions, 'sequential');
  assert.deepEqual(session.order, [1, 2]);
});

test('gradePracticeAnswer marks a correct answer', () => {
  const result = gradePracticeAnswer(sampleQuestions[0], ['A']);
  assert.equal(result.correct, true);
  assert.deepEqual(result.correctAnswer, ['A']);
});

test('gradePracticeAnswer marks a wrong answer', () => {
  const result = gradePracticeAnswer(sampleQuestions[0], ['B']);
  assert.equal(result.correct, false);
});

test('restorePracticeSession preserves saved order and index while hydrating progress', () => {
  const session = restorePracticeSession(
    sampleQuestions,
    {
      mode: 'random',
      order: [2, 1],
      currentIndex: 1,
    },
    {
      2: { selectedAnswer: ['D'] },
    },
  );

  assert.equal(session.mode, 'random');
  assert.deepEqual(session.order, [2, 1]);
  assert.equal(session.currentIndex, 1);
  assert.deepEqual(session.answers[2], ['D']);
  assert.equal(session.feedback[2].correct, false);
  assert.deepEqual(session.feedback[2].correctAnswer, ['C']);
});
