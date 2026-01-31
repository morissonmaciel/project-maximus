// Markdown and HTML helpers

// Configure marked
const marked = window.marked;
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

export function renderMarkdown(text) {
  if (!text) return '';
  try {
    return marked.parse(text);
  } catch (err) {
    return escapeHtml(text);
  }
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatValue(value, fallback = '--') {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
}
