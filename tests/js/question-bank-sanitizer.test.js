import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeQuestionBankData,
  sanitizeQuestionBankString,
} from '../../src/question-bank-sanitizer.js';

test('sanitizeQuestionBankString removes extracted PDF garbage markers and normalizes spaces', () => {
  const dirty = 'The office needs to ^úÿ\u001a\u0000I\u0000T¤Á\u0003Õg R¡ 54043FF735CC37177B5E4FEBD0383508 migrate to the next version of Windows.';
  const clean = sanitizeQuestionBankString(dirty);

  assert.equal(clean, 'The office needs to migrate to the next version of Windows.');
});

test('sanitizeQuestionBankData cleans nested question bank records recursively', () => {
  const dirty = [
    {
      id: 313,
      stem: 'An end user is unable to access the intranet. A technician needs to confirm whether the Windows web ^úÿ\u001a\u0000I\u0000T¤Á\u0003Õg R¡ 54043FF735CC37177B5E4FEBD0383508 server is online.',
      options: [
        { key: 'C', text: 'RDP' },
      ],
      analysis: {
        whyChoose: 'Use RDP.',
      },
    },
  ];

  const [clean] = sanitizeQuestionBankData(dirty);
  assert.equal(clean.stem, 'An end user is unable to access the intranet. A technician needs to confirm whether the Windows web server is online.');
  assert.equal(clean.options[0].text, 'RDP');
  assert.equal(clean.analysis.whyChoose, 'Use RDP.');
});
