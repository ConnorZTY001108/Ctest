export function renderResultsView(result, questionMap, bankLabel = '') {
  const accuracy = result.total ? Math.round((result.score / result.total) * 100) : 0;
  const wrongItems = result.wrongIds.length
    ? result.wrongIds.map((id) => `
        <li>第 ${id} 题，正确答案：${questionMap.get(id).answer.join(', ')}</li>
      `).join('')
    : '<li>本次考试全部答对。</li>';

  return `
    <section class="results-layout">
      <article class="panel results-summary">
        <h2>考试结果</h2>
        <p>当前题库：${bankLabel}</p>
        <p>得分：${result.score} / ${result.total}</p>
        <p>正确率：${accuracy}%</p>
        <p>用时：${result.durationSeconds} 秒</p>
        <div class="hero-actions">
          <button class="primary-btn" data-action="retry-wrong-questions" ${result.wrongIds.length ? '' : 'disabled'}>错题继续练</button>
          <button class="secondary-btn" data-action="restart-exam">重新开始</button>
        </div>
      </article>
      <article class="panel wrong-list">
        <h3>错题列表</h3>
        <ul>${wrongItems}</ul>
      </article>
    </section>
  `;
}
