import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from pypdf import PdfReader

QUESTION_SPLIT_RE = re.compile(r"(?=Question #\d+ Topic \d+)")
HEADER_RE = re.compile(r"Question #(\d+)\s+(Topic \d+)")
OPTION_RE = re.compile(r"^([A-H])\.\s*(.+)$")
BLANK_OPTION_RE = re.compile(r"^([A-H])\.\s*$")
ANSWER_RE = re.compile(r"(?:正确答案|Correct Answer)[:：]\s*([A-H]+)")
ANSWER_PREFIX_RE = re.compile(r"^(?:正确答案|Correct Answer)[:：]")
MOST_VOTED_SUFFIX_RE = re.compile(r"\s*Most Voted\s*$")
ANSWER_TRANSLATIONS = {
    "空调": "AC",
    "广告": "AD",
}
OPTION_KEYS = "ABCDEFGH"


def parse_answer_keys(line: str) -> list[str]:
    match = ANSWER_RE.search(line)
    if match:
        return list(match.group(1).strip())

    prefix_match = re.search(r"(?:正确答案|Correct Answer)[:：]\s*(\S+)", line)
    if prefix_match:
        token = unicodedata.normalize("NFKC", prefix_match.group(1).strip())
        translated_value = ANSWER_TRANSLATIONS.get(token)
        if translated_value:
            return list(translated_value)

    raise ValueError(f"missing answer in line: {line}")


def normalize_lines(block: str) -> list[str]:
    return [line.strip() for line in block.splitlines() if line.strip()]


def get_question_id(block: str) -> int | None:
    lines = normalize_lines(block)
    if not lines:
        return None

    header_match = HEADER_RE.match(lines[0])
    if not header_match:
        return None

    return int(header_match.group(1))


def validate_option_sequence(options: list[dict]) -> None:
    keys = [option["key"] for option in options]
    if not keys:
        return

    last_index = OPTION_KEYS.index(keys[-1])
    expected_keys = list(OPTION_KEYS[: last_index + 1])
    if keys != expected_keys:
        raise ValueError(f"non-contiguous option keys: {''.join(keys)}")


def parse_question_block(block: str) -> dict:
    lines = normalize_lines(block)
    if not lines:
        raise ValueError("empty question block")

    header_match = HEADER_RE.match(lines[0])
    if not header_match:
        raise ValueError(f"unexpected header: {lines[0]}")

    question_id = int(header_match.group(1))
    topic = header_match.group(2)

    stem_lines = []
    options = []
    answer = None

    for line in lines[1:]:
        blank_option_match = BLANK_OPTION_RE.match(line)
        if blank_option_match:
            raise ValueError(f"blank option text for key: {blank_option_match.group(1)}")

        option_match = OPTION_RE.match(line)
        if option_match:
            option_text = MOST_VOTED_SUFFIX_RE.sub("", option_match.group(2)).strip()
            options.append({"key": option_match.group(1), "text": option_text})
            continue

        if ANSWER_PREFIX_RE.search(line):
            answer = parse_answer_keys(line)
            continue

        if line == "Community vote distribution":
            continue
        if re.fullmatch(r"[A-H]+ \(\d+%\)(?: [A-H]+ \(\d+%\))*", line):
            continue
        if re.fullmatch(r"\[\d{4}/\d{2}\]", line):
            continue
        if line.startswith("http://") or line.startswith("https://"):
            continue

        if not options:
            stem_lines.append(line)

    validate_option_sequence(options)

    if not stem_lines or not options or not answer:
        raise ValueError(f"incomplete question block: {question_id}")

    return {
        "id": question_id,
        "topic": topic,
        "stem": " ".join(stem_lines),
        "options": options,
        "answer": answer,
        "type": "single" if len(answer) == 1 else "multiple",
    }


def summarize_skip_reason(error: ValueError) -> str:
    return str(error).split(":", 1)[0]


def extract_questions_with_report(pdf_path: Path) -> tuple[list[dict], dict]:
    reader = PdfReader(str(pdf_path))
    full_text = "\n".join((page.extract_text() or "") for page in reader.pages)
    blocks = [
        chunk
        for chunk in QUESTION_SPLIT_RE.split(full_text)
        if chunk.strip().startswith("Question #")
    ]
    questions = []
    skipped_ids = []
    reason_counts = Counter()
    for block in blocks:
        try:
            questions.append(parse_question_block(block))
        except ValueError as error:
            question_id = get_question_id(block)
            if question_id is not None:
                skipped_ids.append(question_id)
            reason_counts[summarize_skip_reason(error)] += 1
            continue

    report = {
        "parsed_count": len(questions),
        "skipped_count": len(skipped_ids),
        "skipped_ids": skipped_ids,
        "reason_counts": dict(reason_counts),
    }
    return questions, report


def extract_questions(pdf_path: Path) -> list[dict]:
    questions, _report = extract_questions_with_report(pdf_path)
    return questions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    questions, report = extract_questions_with_report(Path(args.input))
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(questions)} questions to {output_path}")
    print(f"Skipped {report['skipped_count']} questions: {report['skipped_ids']}")
    reason_summary = ", ".join(
        f"{reason}={count}" for reason, count in report["reason_counts"].items()
    )
    print(f"Skip reasons: {reason_summary}")


if __name__ == "__main__":
    main()
