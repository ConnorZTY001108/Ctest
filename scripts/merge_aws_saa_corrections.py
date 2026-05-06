import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'questions.aws-saa.json'
CORRECTIONS_DIR = ROOT / '.codex-runtime' / 'aws_saa_agent_outputs'
OUTPUT = ROOT / 'data' / 'questions.aws-saa.json'


def load_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def main():
    questions = load_json(SOURCE)
    by_id = {question['id']: question for question in questions}
    corrected_count = 0

    for path in sorted(CORRECTIONS_DIR.glob('q*-q*.corrected.json')):
        corrected_questions = load_json(path)
        for corrected in corrected_questions:
            question_id = corrected['id']
            if question_id not in by_id:
                raise ValueError(f'{path} contains unexpected question id {question_id}')
            original = by_id[question_id]
            for key in ('id', 'topic', 'answer', 'type', 'source'):
                if corrected.get(key) != original.get(key):
                    raise ValueError(f'{path} changed {key} for question {question_id}')
            by_id[question_id] = corrected
            corrected_count += 1

    merged = [by_id[question['id']] for question in questions]
    OUTPUT.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'merged {corrected_count} corrected records from {CORRECTIONS_DIR}')


if __name__ == '__main__':
    main()
