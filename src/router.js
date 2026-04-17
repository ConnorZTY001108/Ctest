const SUPPORTED_ROUTES = new Set(['home', 'practice', 'exam', 'results', 'mistakes']);
const ROUTE_LABELS = {
  home: '首页',
  practice: '练习',
  exam: '考试',
  results: '结果',
  mistakes: '错题本',
};

export function normalizeRoute(hash) {
  const cleaned = (hash || '').replace(/^#\/?/, '').trim();
  return SUPPORTED_ROUTES.has(cleaned) ? cleaned : 'home';
}

export function navigate(routeName) {
  window.location.hash = routeName === 'home' ? '#/' : `#/${routeName}`;
}

export function getRouteLabel(hash) {
  return ROUTE_LABELS[normalizeRoute(hash)] || ROUTE_LABELS.home;
}
