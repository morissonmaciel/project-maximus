const DEFAULT_FETCH_MAX_CHARS = 50_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_ERROR_MAX_CHARS = 4_000;
const DEFAULT_FETCH_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export function truncateText(value, maxChars) {
  if (value.length <= maxChars) return { text: value, truncated: false };
  return { text: value.slice(0, maxChars), truncated: true };
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\\\d+);/gi, (_, dec) => String.fromCharCode(Number.parseInt(dec, 10)));
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, ''));
}

function normalizeWhitespace(value) {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function htmlToMarkdown(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? normalizeWhitespace(stripTags(titleMatch[1])) : undefined;
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, body) => {
    const label = normalizeWhitespace(stripTags(body));
    if (!label) return href;
    return `[${label}](${href})`;
  });
  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => {
    const prefix = '#'.repeat(Math.max(1, Math.min(6, Number.parseInt(level, 10))));
    const label = normalizeWhitespace(stripTags(body));
    return `\n${prefix} ${label}\n`;
  });
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, body) => {
    const label = normalizeWhitespace(stripTags(body));
    return label ? `\n- ${label}` : '';
  });
  text = text
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|table|tr|ul|ol)>/gi, '\n');
  text = stripTags(text);
  text = normalizeWhitespace(text);
  return { text, title };
}

export function markdownToText(markdown) {
  let text = markdown;
  text = text.replace(/!\[[^\]]*]\[[^)]+\]/g, '');
  text = text.replace(/\\\[([^\]]+)]\([^)]+\)/g, '$1');
  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```[^\n]*\n?/g, '').replace(/```/g, '')
  );
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  return normalizeWhitespace(text);
}

function looksLikeHtml(value) {
  const trimmed = value.trimStart();
  if (!trimmed) return false;
  const head = trimmed.slice(0, 256).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

async function readResponseText(res) {
  const text = await res.text();
  return text || '';
}

function formatWebFetchErrorDetail({ detail, contentType, maxChars }) {
  if (!detail) return '';
  let text = detail;
  const contentTypeLower = contentType?.toLowerCase();
  if (contentTypeLower?.includes('text/html') || looksLikeHtml(detail)) {
    const rendered = htmlToMarkdown(detail);
    const withTitle = rendered.title ? `${rendered.title}\n${rendered.text}` : rendered.text;
    text = markdownToText(withTitle);
  }
  const truncated = truncateText(text.trim(), maxChars);
  return truncated.text;
}

export async function runWebFetch(input) {
  const url = typeof input?.url === 'string' ? input.url.trim() : '';
  if (!url) {
    return { error: 'URL is required' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { error: 'Invalid URL: must be http or https' };
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { error: 'Invalid URL: must be http or https' };
  }

  const extractMode = input?.extractMode === 'text' ? 'text' : 'markdown';
  const maxChars = Number.isFinite(input?.maxChars) ? Math.max(100, Math.floor(input.maxChars)) : DEFAULT_FETCH_MAX_CHARS;
  const timeoutMs = Number.isFinite(input?.timeout_ms) ? input.timeout_ms : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(parsedUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: '*/*',
        'User-Agent': DEFAULT_FETCH_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });

    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    const body = await readResponseText(res);

    if (!res.ok) {
      const detail = formatWebFetchErrorDetail({
        detail: body,
        contentType,
        maxChars: DEFAULT_ERROR_MAX_CHARS
      });
      return { error: `Web fetch failed (${res.status}): ${detail || res.statusText}` };
    }

    let title;
    let extractor = 'raw';
    let text = body;
    if (contentType.includes('text/html') || looksLikeHtml(body)) {
      const rendered = htmlToMarkdown(body);
      title = rendered.title;
      text = extractMode === 'text' ? markdownToText(rendered.text) : rendered.text;
      extractor = 'html';
    } else if (contentType.includes('application/json')) {
      try {
        text = JSON.stringify(JSON.parse(body), null, 2);
        extractor = 'json';
      } catch {
        text = body;
        extractor = 'raw';
      }
    }

    const truncated = truncateText(text, maxChars);
    return {
      url,
      finalUrl: res.url || url,
      status: res.status,
      contentType,
      title,
      extractMode,
      extractor,
      truncated: truncated.truncated,
      length: truncated.text.length,
      fetchedAt: new Date().toISOString(),
      tookMs: Date.now() - start,
      text: truncated.text
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  } finally {
    clearTimeout(timer);
  }
}
