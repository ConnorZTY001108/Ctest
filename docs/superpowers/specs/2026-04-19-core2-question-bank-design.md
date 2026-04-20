# core2 题库接入增量设计

- 日期：2026-04-19
- 项目目录：`C:\Users\19612\Desktop\Project\Question`
- 新题库来源：`C:\Users\19612\Downloads\220-1202.pdf`
- 变更类型：现有纯前端刷题系统新增第三个独立题库

## 1. 目标

将 `220-1202.pdf` 提取为新的独立题库，并在现有刷题系统中增加一个新的题库切换入口，显示名为 `core2`。

接入后：

- 首页、练习、考试、结果、错题本都可以切换到 `core2`
- `core2` 拥有自己独立的进度、错题、考试记录和学习存档数据
- 现有 `zh` 与 `en` 两套题库数据和记录保持不变

本次增量不做题目级别的跨题库对照，也不合并题号。

## 2. 范围

### 本次要做

- 从 `220-1202.pdf` 生成新的题库 JSON：`data/questions.core2.json`
- 前端题库切换器增加 `core2`
- 题库存储从现有的 `zh/en` 扩展为 `zh/en/core2`
- 学习存档 `question-archive.json` 自动包含 `core2`
- 增加覆盖第三题库切换与隔离存储的测试

### 本次不做

- 不替换现有中文题库
- 不修改现有 `zh` 与 `en` 题库题目内容
- 不做自动扫描 `data/` 目录生成题库列表
- 不做不同题库之间的错题合并

## 3. 方案选择

本次采用“轻量配置化”的方案。

### 具体做法

- 保留前端显式题库列表
- 题库列表从“只供页面显示”提升为“同时驱动状态与存档的配置源”
- 新增 `core2` 配置项：

```js
{ id: 'core2', label: 'core2', file: './data/questions.core2.json' }
```

### 选择理由

- 相比直接在多个文件硬编码 `core2`，集中配置更容易扩展
- 相比自动扫描目录，显式配置更稳定，便于控制显示名
- 当前代码库已经有题库列表雏形，扩展成本低

## 4. 数据设计

### 新增题库文件

- `data/questions.core2.json`

### 题目结构

新题库继续沿用现有题目结构：

```json
{
  "id": 1,
  "topic": "Topic 1",
  "stem": "Question text",
  "options": [
    { "key": "A", "text": "Option A" },
    { "key": "B", "text": "Option B" }
  ],
  "answer": ["A"],
  "type": "single"
}
```

### 题库标识

- `zh`：现有中文题库
- `en`：现有英文题库
- `core2`：新接入的 `220-1202` 题库

## 5. PDF 解析设计

### 输入

- 原始 PDF：`C:\Users\19612\Downloads\220-1202.pdf`

### 输出

- 生成文件：`data/questions.core2.json`

### 解析策略

- 继续复用 `scripts/extract_questions.py`
- 不单独复制一个新解析脚本
- 若 `220-1202.pdf` 版式与现有脚本兼容，则直接生成
- 若出现新的题头、选项或答案模式，则在原脚本中扩展规则，并确保不破坏 `zh` / `en` 已有支持

### CLI 约定

继续使用显式输入输出参数：

```bash
python scripts/extract_questions.py --input "C:\Users\19612\Downloads\220-1202.pdf" --output "data/questions.core2.json"
```

## 6. 前端状态与存储设计

### 当前问题

现有状态层虽然已经支持多题库，但 `BANK_IDS` 仍然是固定的 `['zh', 'en']`。新增第三题库时，需要同步扩展状态归一化逻辑，否则 `core2` 的记录无法正确落盘和恢复。

### 设计原则

- 每个题库独立保存以下数据：
  - 练习进度
  - 错题本
  - 考试历史
  - 当前练习会话
  - 当前考试会话
- 切换题库后只显示当前题库对应的数据
- 旧数据迁移规则保持不变：历史单题库存储继续归入 `zh`

### 需要覆盖的状态结构

- `question-app.progress`
- `question-app.mistakes`
- `question-app.exam-history`
- `question-app.current-practice`
- `question-app.current-exam`
- `question-app.preferences.activeBankId`

### 存档结构

`question-archive.json` 中的 `banks` 需要新增：

```json
"core2": {
  "progress": {},
  "mistakes": [],
  "examHistory": [],
  "currentPractice": null,
  "currentExam": null
}
```

## 7. 页面与交互设计

### 首页

- 题库切换区新增一个按钮：`core2`
- 点击后切换当前题库并重新渲染统计卡片
- 当前选中态与现有 `zh` / `en` 一致

### 练习页

- 顶部题库标签显示 `core2`
- 题目来源改为 `questions.core2.json`
- `core2` 的练习记录不影响其他题库

### 考试页

- 可从 `core2` 开始 90 题随机考试
- 刷新页面后继续保留当前 `core2` 试卷

### 结果页

- 仅展示 `core2` 的最近一次考试结果

### 错题本页

- 仅展示 `core2` 的错题
- 从错题本重练时，只重练 `core2` 当前错题列表

## 8. 代码改动范围

### 需要修改

- `src/app.js`
  - 新增 `core2` 题库配置
  - 保持切换逻辑支持第三题库
- `src/state.js`
  - 将固定 bank id 列表扩展为包含 `core2`
  - 保证归一化、迁移、状态恢复支持第三题库
- `tests/js/app.test.js`
  - 增加 `core2` 题库切换与隔离存储测试
- `tests/js/*`
  - 如有依赖 bank id 固定列表的测试，补齐 `core2`

### 需要新增

- `data/questions.core2.json`

### 可能修改

- `scripts/extract_questions.py`
  - 仅当 `220-1202.pdf` 格式与现有解析规则不兼容时才修改

## 9. 兼容与迁移

### 现有用户数据

- `zh` 和 `en` 的本地记录保持原样
- 新版本初始化后，若本地没有 `core2` 记录，则自动初始化为空桶
- 不清空任何已有学习数据

### 风险控制

- 不能让 `core2` 的错题污染 `zh/en`
- 不能让 `activeBankId` 指向 `core2` 时因缺桶导致空白页或异常
- 学习存档在未绑定文件时仍保持原有本地存储行为

## 10. 验证策略

### 数据验证

- 解析脚本成功生成 `data/questions.core2.json`
- JSON 可被前端正常加载

### 交互验证

- 首页能切到 `core2`
- 切换后统计卡片跟随变化
- `core2` 中练习、考试、错题本独立工作
- 切回 `zh/en` 后原记录仍然存在

### 回归验证

- `zh` 与 `en` 题库加载不受影响
- 学习存档序列化仍然通过
- 考试、错题练习、错题移除等现有行为不退化

## 11. 已确认决策

- `220-1202.pdf` 作为第三个独立题库接入
- 新题库显示名固定为 `core2`
- `core2` 不替换现有中文题库
- 三个题库的进度、错题、考试记录完全隔离
