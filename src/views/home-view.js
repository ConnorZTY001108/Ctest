export function renderHomeView({ stats, banks, activeBankId }) {
  return `
    <section class="hero-grid">
      <article class="panel hero-card">
        <div class="bank-switcher">
          ${banks.map((bank) => `
            <button
              class="${bank.id === activeBankId ? 'primary-btn' : 'secondary-btn'}"
              data-action="select-bank"
              data-bank-id="${bank.id}"
            >${bank.label}</button>
          `).join('')}
        </div>
        <p class="eyebrow">Question Workspace</p>
        <h2>专注刷题，不做多余操作</h2>
        <p class="hero-copy">练习模式用于即时判题，模拟考试用于整套自测，所有记录保存在当前浏览器。</p>
        <div class="hero-actions">
          <button class="primary-btn" data-action="start-practice" data-mode="sequential">练习模式</button>
          <button class="secondary-btn" data-route="exam">模拟考试</button>
        </div>
      </article>
      <article class="panel stats-card">
        <div class="stat-row"><span>题库总量</span><strong>${stats.totalQuestions}</strong></div>
        <div class="stat-row"><span>已做题数</span><strong>${stats.answeredCount}</strong></div>
        <div class="stat-row"><span>正确率</span><strong>${stats.accuracy}%</strong></div>
        <div class="stat-row"><span>错题数</span><strong>${stats.mistakeCount}</strong></div>
        <div class="stat-row"><span>最近考试</span><strong>${stats.lastExamScore}</strong></div>
      </article>
    </section>
  `;
}
