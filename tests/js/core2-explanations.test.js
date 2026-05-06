import test from 'node:test';
import assert from 'node:assert/strict';
import { decorateCore2Questions, getCore2Explanation } from '../../src/core2-explanations.js';

test('getCore2Explanation generates a concise technical explanation for GUI Linux remote support', () => {
  const explanation = getCore2Explanation({
    id: 2,
    stem: 'A technician needs to provide remote support for a legacy Linux-based operating system from their Windows laptop. The solution needs to allow the technician to see what the user is doing and provide the ability to interact with the user session. Which of the following remote access technologies would support the use case?',
    options: [
      { key: 'A', text: 'VPN' },
      { key: 'B', text: 'VNC' },
      { key: 'C', text: 'SSH' },
      { key: 'D', text: 'RDP' },
    ],
    answer: ['B'],
    type: 'single',
  });

  assert.match(explanation, /VNC/);
  assert.match(explanation, /图形/);
  assert.match(explanation, /Linux/);
});

test('decorateCore2Questions adds explanations without mutating existing fields', () => {
  const questions = [
    {
      id: 64,
      stem: 'A customer wants to work from home without carrying company hardware back and forth. Which of the following would allow the user to remotely access and use a Windows PC at the main office? (Choose two.)',
      options: [
        { key: 'A', text: 'SSH' },
        { key: 'B', text: 'VNC' },
        { key: 'C', text: 'RDP' },
        { key: 'D', text: 'VPN' },
      ],
      answer: ['C', 'D'],
      type: 'multiple',
    },
  ];

  const decorated = decorateCore2Questions(questions);

  assert.equal(decorated[0].id, 64);
  assert.deepEqual(decorated[0].answer, ['C', 'D']);
  assert.match(decorated[0].explanation, /RDP/);
  assert.match(decorated[0].explanation, /VPN/);
});
