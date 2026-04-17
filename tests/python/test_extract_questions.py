import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from scripts.extract_questions import (
    extract_questions,
    extract_questions_with_report,
    main,
    parse_answer_keys,
    parse_question_block,
)


class ExtractQuestionTests(unittest.TestCase):
    def test_parse_answer_keys_supports_multiple_answers(self):
        self.assertEqual(parse_answer_keys("正确答案：DE"), ["D", "E"])
        self.assertEqual(parse_answer_keys("正确答案：C"), ["C"])

    def test_parse_answer_keys_supports_english_prefix(self):
        self.assertEqual(parse_answer_keys("Correct Answer:DE"), ["D", "E"])
        self.assertEqual(parse_answer_keys("Correct Answer:C"), ["C"])

    def test_parse_answer_keys_normalizes_translated_multi_answer_labels(self):
        self.assertEqual(parse_answer_keys("正确答案：空调"), ["A", "C"])
        self.assertEqual(parse_answer_keys("正确答案：广告"), ["A", "D"])
        self.assertEqual(parse_answer_keys("正确答案：⼴告"), ["A", "D"])

    def test_parse_question_block_returns_normalized_question(self):
        block = """Question #4 Topic 1
网络管理员必须确保打印机能够被分配到特定的 IP 地址。
A. VLAN
B. 租赁
C. 预订
D. 排除
正确答案：C
"""
        parsed = parse_question_block(block)
        self.assertEqual(parsed["id"], 4)
        self.assertEqual(parsed["topic"], "Topic 1")
        self.assertEqual(parsed["answer"], ["C"])
        self.assertEqual(parsed["type"], "single")
        self.assertEqual(parsed["options"][2]["text"], "预订")

    def test_parse_question_block_returns_normalized_english_question(self):
        block = """Question #4 Topic 1
A network administrator must ensure that a printer will still be assigned a specific IP address.
A. VLAN
B. Lease
C. Reservation
D. Exclusion
Correct Answer:C
"""
        parsed = parse_question_block(block)
        self.assertEqual(parsed["id"], 4)
        self.assertEqual(parsed["topic"], "Topic 1")
        self.assertEqual(parsed["answer"], ["C"])
        self.assertEqual(parsed["type"], "single")
        self.assertEqual(parsed["options"][2]["text"], "Reservation")

    def test_parse_question_block_preserves_valid_a_through_h_question(self):
        block = """Question #143 Topic 1
一位技术人员正在设置工作站。为了确保用户可以连接到网络，技术人员应该配置以下哪些设置？（选择三项。）
A. APIRA
B. 门户
C. IP 地址
D. 子网掩码
E. 静态路线
F. UPnP 设置
G. NAT 规则
H. MAC 过滤器
正确答案：BCD
"""
        parsed = parse_question_block(block)
        self.assertEqual(parsed["id"], 143)
        self.assertEqual(parsed["answer"], ["B", "C", "D"])
        self.assertEqual(parsed["type"], "multiple")
        self.assertEqual(len(parsed["options"]), 8)
        self.assertEqual(parsed["options"][-1], {"key": "H", "text": "MAC 过滤器"})

    def test_parse_question_block_rejects_blank_leading_option(self):
        block = """Question #20 Topic 1
用户可以使用以下哪种方式将手机网络连接共享到笔记本电脑？
A.
B. NFC
C. Wi-Fi Direct
D. 系绳
正确答案：D
"""
        with self.assertRaises(ValueError):
            parse_question_block(block)

    def test_parse_question_block_rejects_missing_option_key_before_later_option(self):
        block = """Question #311 Topic 1
以下哪些记录允许用户使用易于记忆的标题而不是 IPv4 地址来访问服务器？（选择两项。）
A. SPF
B. AAAA
C. CNAME
D. TXT
E.
F. A
正确答案：CF
"""
        with self.assertRaises(ValueError):
            parse_question_block(block)

    def test_extract_questions_skips_unparseable_simulation_blocks(self):
        text = """Question #1 Topic 1
有效题干
A. 选项一
B. 选项二
正确答案：A
Question #2 Topic 1
模拟场景
-
根据客户需求完成拖拽。
正确答案：
Question #3 Topic 1
另一道有效题
A. 甲
B. 乙
正确答案：B
"""

        class FakePage:
            def extract_text(self):
                return text

        class FakeReader:
            def __init__(self, _path):
                self.pages = [FakePage()]

        with patch("scripts.extract_questions.PdfReader", FakeReader):
            parsed = extract_questions(Path("ignored.pdf"))

        self.assertEqual([question["id"] for question in parsed], [1, 3])

    def test_extract_questions_skips_malformed_multiple_choice_blocks(self):
        text = """Question #20 Topic 1
用户可以使用以下哪种方式将手机网络连接共享到笔记本电脑？
A.
B. NFC
C. Wi-Fi Direct
D. 系绳
正确答案：D
Question #21 Topic 1
有效题干
A. 选项一
B. 选项二
正确答案：A
Question #311 Topic 1
以下哪些记录允许用户使用易于记忆的标题而不是 IPv4 地址来访问服务器？（选择两项。）
A. SPF
B. AAAA
C. CNAME
D. TXT
E.
F. A
正确答案：CF
"""

        class FakePage:
            def extract_text(self):
                return text

        class FakeReader:
            def __init__(self, _path):
                self.pages = [FakePage()]

        with patch("scripts.extract_questions.PdfReader", FakeReader):
            parsed = extract_questions(Path("ignored.pdf"))

        self.assertEqual([question["id"] for question in parsed], [21])

    def test_extract_questions_with_report_tracks_skipped_ids_and_reasons(self):
        text = """Question #1 Topic 1
有效题干
A. 选项一
B. 选项二
正确答案：A
Question #2 Topic 1
用户可以使用以下哪种方式将手机网络连接共享到笔记本电脑？
A.
B. NFC
C. Wi-Fi Direct
D. 系绳
正确答案：D
Question #143 Topic 1
一位技术人员正在设置工作站。为了确保用户可以连接到网络，技术人员应该配置以下哪些设置？（选择三项。）
A. APIRA
B. 门户
C. IP 地址
D. 子网掩码
E. 静态路线
F. UPnP 设置
G. NAT 规则
H. MAC 过滤器
正确答案：BCD
"""

        class FakePage:
            def extract_text(self):
                return text

        class FakeReader:
            def __init__(self, _path):
                self.pages = [FakePage()]

        with patch("scripts.extract_questions.PdfReader", FakeReader):
            questions, report = extract_questions_with_report(Path("ignored.pdf"))

        self.assertEqual([question["id"] for question in questions], [1, 143])
        self.assertEqual(report["parsed_count"], 2)
        self.assertEqual(report["skipped_count"], 1)
        self.assertEqual(report["skipped_ids"], [2])
        self.assertEqual(report["reason_counts"], {"blank option text for key": 1})

    def test_main_writes_json_to_requested_output_path_and_reports_summary(self):
        questions = [{"id": 1, "answer": ["A"], "type": "single"}]
        report = {
            "parsed_count": 1,
            "skipped_count": 2,
            "skipped_ids": [20, 311],
            "reason_counts": {
                "blank option text for key": 1,
                "non-contiguous option keys": 1,
            },
        }
        with TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "nested" / "questions.json"
            with patch(
                "scripts.extract_questions.extract_questions_with_report",
                return_value=(questions, report),
            ):
                with patch("builtins.print") as print_mock:
                    with patch(
                        "sys.argv",
                        [
                            "extract_questions.py",
                            "--input",
                            "ignored.pdf",
                            "--output",
                            str(output_path),
                        ],
                    ):
                        main()

            self.assertTrue(output_path.exists())
            self.assertEqual(output_path.read_text(encoding="utf-8").strip(), '[\n  {\n    "id": 1,\n    "answer": [\n      "A"\n    ],\n    "type": "single"\n  }\n]')
            self.assertEqual(
                [call.args[0] for call in print_mock.call_args_list],
                [
                    f"Wrote 1 questions to {output_path}",
                    "Skipped 2 questions: [20, 311]",
                    "Skip reasons: blank option text for key=1, non-contiguous option keys=1",
                ],
            )


if __name__ == "__main__":
    unittest.main()
