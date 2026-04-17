function renderCorrectAnswerList(question) {
  return question.answer.map((key) => {
    const option = question.options.find((item) => item.key === key);
    const label = option ? `${key}. ${option.text}` : key;
    return `<li>${label}</li>`;
  }).join('');
}

function renderMistakeCard(question) {
  return `
    <article class="panel mistake-card" data-question-id="${question.id}">
      <div class="mistake-card__meta">
        <span>${question.topic ?? 'Mistake'}</span>
        <strong>#${question.id}</strong>
      </div>
      <h3 class="mistake-card__stem">${question.stem}</h3>
      <p class="mistake-card__type">${question.type === 'multiple' ? 'Multiple choice' : 'Single choice'}</p>
      <div class="mistake-card__answers">
        <strong>Correct answer</strong>
        <ul>${renderCorrectAnswerList(question)}</ul>
      </div>
      <div class="toolbar">
        <button class="secondary-btn" data-action="remove-mistake" data-question-id="${question.id}">Remove</button>
      </div>
    </article>
  `;
}

function renderArchivePanel(archiveStatus) {
  const status = {
    supported: false,
    bound: false,
    fileName: '',
    syncState: 'unsupported',
    lastSyncedAt: null,
    message: '当前浏览器不支持本地文件自动同步。',
    ...archiveStatus,
  };

  return `
    <article class="panel archive-panel">
      <div>
        <p class="eyebrow">Learning Archive</p>
        <h3>学习存档 JSON</h3>
        <p>${status.bound
          ? `当前文件：${status.fileName}`
          : '创建一个本地 JSON 文件，自动同步当前完整学习状态。'}</p>
        <p class="archive-status" data-archive-status>${status.message}</p>
        ${status.lastSyncedAt ? `<p class="archive-meta">最近同步：${status.lastSyncedAt}</p>` : ''}
      </div>
      ${status.supported ? `
        <button class="secondary-btn" data-action="bind-learning-archive">
          ${status.bound ? '重新绑定学习存档' : '创建学习存档 JSON'}
        </button>
      ` : ''}
    </article>
  `;
}

export function renderMistakesView(mistakes, bankLabel = '', archiveStatus = {}) {
  const archivePanel = renderArchivePanel(archiveStatus);

  if (!mistakes.length) {
    return `
      <section class="mistakes-layout">
        ${archivePanel}
        <section class="panel mistakes-empty" data-empty-state="mistakes">
          <h2>错题本</h2>
          <p>当前题库：${bankLabel}</p>
          <p>当前没有错题记录，可以先去练习或考试。</p>
        </section>
      </section>
    `;
  }

  return `
    <section class="mistakes-layout">
      <article class="panel mistakes-summary">
        <div>
          <p class="eyebrow">Mistake Notebook</p>
          <h2>错题本</h2>
          <p>当前题库：${bankLabel}</p>
          <p>已收录 ${mistakes.length} 道错题，支持集中重练和逐题移除。</p>
        </div>
        <div class="hero-actions">
          <button class="primary-btn" data-action="retry-mistakes">重练错题</button>
        </div>
      </article>
      ${archivePanel}
      <div class="mistake-list">
        ${mistakes.map((question) => renderMistakeCard(question)).join('')}
      </div>
    </section>
  `;
}
