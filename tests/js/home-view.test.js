import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHomeView } from '../../src/views/home-view.js';

test('renderHomeView shows summary cards and action buttons', () => {
  const html = renderHomeView({
    stats: {
      totalQuestions: 100,
      answeredCount: 40,
      accuracy: 75,
      mistakeCount: 8,
      lastExamScore: '18 / 20',
    },
    activeBankId: 'zh',
    banks: [
      { id: 'zh', label: '中文题库' },
      { id: 'en', label: 'English Question Bank' },
    ],
  });

  assert.match(html, /练习模式/);
  assert.match(html, /模拟考试/);
  assert.match(html, /data-action="start-practice"/);
  assert.match(html, /data-mode="sequential"/);
  assert.match(html, /data-action="select-bank"/);
  assert.match(html, /data-bank-id="zh"/);
  assert.match(html, /data-bank-id="en"/);
  assert.match(html, /中文题库/);
  assert.match(html, /English Question Bank/);
  assert.match(html, /100/);
  assert.match(html, /18 \/ 20/);
});
