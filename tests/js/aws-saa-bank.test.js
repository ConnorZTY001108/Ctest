import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const bankPath = new URL('../../data/questions.aws-saa.json', import.meta.url);

test('AWS SAA screenshot bank is valid quiz-service JSON', () => {
  const questions = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

  assert.equal(questions.length, 143);
  assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 143 }, (_, index) => index + 1));

  for (const question of questions) {
    assert.equal(typeof question.stem, 'string');
    assert.ok(question.stem.length > 20);
    assert.ok(Array.isArray(question.options));
    assert.ok(question.options.length >= 4);
    assert.ok(Array.isArray(question.answer));
    assert.ok(question.answer.length >= 1);
    assert.equal(question.type, question.answer.length === 1 ? 'single' : 'multiple');

    const optionKeys = new Set(question.options.map((option) => option.key));
    for (const answerKey of question.answer) {
      assert.ok(optionKeys.has(answerKey), `question ${question.id} answer ${answerKey} is missing from options`);
    }
  }
});

test('AWS SAA screenshot bank has no known OCR artifact markers', () => {
  const questions = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const brokenAsciiPattern = /AW S|S 3\b|S30\b|Qu ick|CI oud|Cloud Front|N LB|N LBs|NLBO|Ste p|La ke|Lam bda|La m bda|Au ro|Au rora|Ama zo n|EIastiCache|GIacier|ScaIing|ControI|AcceIerate|AmpIify|lnspector|SnowbalI|SnowbaII|Servero|Fargateo|Serviceo|Archiveo|DynamoDBfi|CloudTraiI|CloudTrai10|EKSO|AWS0|VPCo|Sto re|We b|fo r|Fu nctions|B lock|E C 2|D connect|Auto S caling|S e rve r/;
  const brokenChineseTerms = ['佇自', '敏咸', '氵肖', '规贝', '亻乍', '甲地址'];
  const brokenSymbols = /[《》凵丨]/;
  const failures = [];

  for (const question of questions) {
    const fields = [
      ['stem', question.stem],
      ...question.options.map((option) => [`option ${option.key}`, option.text]),
    ];

    if (/^\s*\d+\s+\/\s*143|^\s*\d+\s+\d+\s*\/\s*143/.test(question.stem)) {
      failures.push(`Q${question.id} stem has page counter`);
    }

    for (const [field, text] of fields) {
      if (/[。；，]\s*[a-e]\s*$/.test(text)) {
        failures.push(`Q${question.id} ${field} has trailing answer marker`);
      }
      if (text.includes('?')) {
        failures.push(`Q${question.id} ${field} has ASCII question mark replacement text`);
      }
      if (brokenAsciiPattern.test(text)) {
        failures.push(`Q${question.id} ${field} has broken ASCII service text`);
      }
      if (brokenSymbols.test(text) || brokenChineseTerms.some((term) => text.includes(term))) {
        failures.push(`Q${question.id} ${field} has OCR symbol noise`);
      }
    }
  }

  assert.deepEqual(failures, []);
});
