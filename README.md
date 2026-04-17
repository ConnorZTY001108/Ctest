# Ctest

一个纯前端的刷题系统，支持中英文双题库、练习模式、模拟考试、错题本，以及本地学习存档。

## 功能

- 中文题库 / English Question Bank 切换
- 练习模式：即时判题、自动记录错题
- 模拟考试：交卷后查看成绩和错题
- 错题本：集中复习、移除已掌握题目
- 本地学习存档：可创建 `question-archive.json`，之后自动同步完整学习状态

## 技术栈

- 原生 HTML / CSS / JavaScript
- Python + `pypdf` 用于从 PDF 提取题库数据
- Node 内置测试运行器 + Python `unittest`

## 本地启动

```bash
npm run serve
```

然后打开：

```text
http://127.0.0.1:4173
```

## 测试

```bash
npm test
python -m unittest discover -s tests/python -p "test_*.py"
```

## 题库数据

项目当前包含两份已提取好的题库数据：

- `data/questions.zh.json`
- `data/questions.en.json`

原始 PDF 不包含在仓库中。

## 学习记录

当前学习记录默认保存在浏览器本地存储中，不会自动上传到 GitHub。

如果你在页面里创建了学习存档文件：

- 默认文件名为 `question-archive.json`
- 该文件也不会被提交到仓库

## 仓库说明

这个初始化版本只上传可运行的前端代码、测试和题库 JSON。

以下内容不会进入仓库：

- 原始 PDF
- 本地学习记录
- 运行缓存
- 内部规划文档
