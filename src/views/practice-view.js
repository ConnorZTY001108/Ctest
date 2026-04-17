export function renderPracticeView(question, session, feedback, selectedAnswer = [], bankLabel = '') {
  const currentNumber = session.currentIndex + 1;
  const total = session.order.length;

  return `
    <section class="workspace-grid">
      <article class="panel question-panel">
        <div class="question-meta">
          <span>${bankLabel}</span>
          <strong>第 ${currentNumber} / ${total} 题</strong>
        </div>
        <h2 class="question-stem">${question.stem}</h2>
        <div class="option-list">
          ${question.options.map((option) => `
            <label class="option-item">
              <input
                type="${question.type === 'single' ? 'radio' : 'checkbox'}"
                name="answer"
                value="${option.key}"
                ${selectedAnswer.includes(option.key) ? 'checked' : ''}
              />
              <span>${option.key}. ${option.text}</span>
            </label>
          `).join('')}
        </div>
        <div class="toolbar">
          <button class="secondary-btn" data-action="practice-prev" ${session.currentIndex === 0 ? 'disabled' : ''}>上一题</button>
          <button class="primary-btn" data-action="practice-submit">提交答案</button>
          <button class="secondary-btn" data-action="practice-next" ${session.currentIndex === total - 1 ? 'disabled' : ''}>下一题</button>
        </div>
        ${feedback ? `
          <div class="feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}">
            <strong>${feedback.correct ? '回答正确' : '回答错误'}</strong>
            <p>正确答案：${feedback.correctAnswer.join(', ')}</p>
          </div>
        ` : ''}
      </article>
      <aside class="panel navigator-panel" id="practice-nav">
        <h3>练习进度</h3>
        <p>当前题库：${bankLabel}</p>
        <p>当前模式：${session.mode === 'random' ? '随机' : '顺序'}</p>
      </aside>
    </section>
  `;
}
