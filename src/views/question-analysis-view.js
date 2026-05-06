function renderOutline(analysis) {
  return `
    <div class="analysis-section">
      <strong>分析提纲</strong>
      <ul>
        ${analysis.outline.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderWhyChoose(analysis) {
  return `
    <div class="analysis-section">
      <strong>为什么选</strong>
      <p>${analysis.whyChoose}</p>
    </div>
  `;
}

function renderWhyNotChoose(analysis) {
  return `
    <div class="analysis-section">
      <strong>为什么不选</strong>
      <ul>
        ${analysis.whyNotChoose
          .map((item) => `<li><span>${item.key}. ${item.text}</span>：${item.reason}</li>`)
          .join('')}
      </ul>
    </div>
  `;
}

export function renderQuestionAnalysis(analysis) {
  if (!analysis) return '';

  return `
    <section class="question-analysis">
      ${renderWhyChoose(analysis)}
      ${renderWhyNotChoose(analysis)}
      ${renderOutline(analysis)}
    </section>
  `;
}
