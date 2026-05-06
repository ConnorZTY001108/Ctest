import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCore2Analysis } from '../src/core2-analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.join(projectRoot, 'data', 'questions.core2.json');
const outputPath = path.join(projectRoot, 'data', 'questions.core2.analysis.json');

const questions = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const records = questions.map((question) => {
  const analysis = buildCore2Analysis(question);
  return {
    id: question.id,
    explanation: analysis.whyChoose,
    analysis,
  };
});

fs.writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
console.log(`Wrote ${records.length} core2 analysis records to ${outputPath}`);
