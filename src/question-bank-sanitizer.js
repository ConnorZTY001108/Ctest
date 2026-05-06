const PDF_GARBAGE_MARKER_RE = /\s*\^[\s\S]{0,160}?54043FF735CC37177B5E4FEBD0383508\s*/g;
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const MULTISPACE_RE = /\s{2,}/g;

export function sanitizeQuestionBankString(value) {
  if (typeof value !== 'string') return value;

  return value
    .replace(PDF_GARBAGE_MARKER_RE, ' ')
    .replace(CONTROL_CHAR_RE, ' ')
    .replace(MULTISPACE_RE, ' ')
    .trim();
}

export function sanitizeQuestionBankData(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeQuestionBankData(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeQuestionBankData(item)]),
    );
  }

  return sanitizeQuestionBankString(value);
}
