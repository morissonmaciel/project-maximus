import { getEmbeddingProvider } from './embeddings.js';
import { deserializeEmbedding, cosineSimilarity } from './chunking.js';

export function buildMemoryPrompt(chunks) {
  if (!chunks.length) return '';
  const lines = chunks.map((chunk, index) => {
    const header = `# Memory ${index + 1} (${chunk.path}:${chunk.start_line}-${chunk.end_line})`;
    return `${header}\n${chunk.text}`;
  });
  return `The following memory snippets may be relevant:\n\n${lines.join('\n\n')}`;
}

export async function searchSimilar({
  db,
  params,
  onStatus,
  onState
}) {
  const query = params.query?.trim();
  if (!query) return [];

  let providerInstance;
  try {
    providerInstance = await getEmbeddingProvider(onStatus, onState);
  } catch (err) {
    return [];
  }

  const queryEmbedding = await providerInstance.embedQuery(query);
  const limit = params.limit || 5;
  const sources = Array.isArray(params.sources)
    ? params.sources
    : [params.source || 'chat'];
  const maxCandidates = params.maxCandidates || 500;

  const placeholders = sources.map(() => '?').join(',');
  const stmt = db.prepare(
    `SELECT id, path, source, start_line, end_line, text, embedding, model
     FROM chunks
     WHERE source IN (${placeholders})
     ORDER BY updated_at DESC
     LIMIT ?;`
  );
  const rows = stmt.all(...sources, maxCandidates);

  const scored = [];
  for (const row of rows) {
    const embedding = deserializeEmbedding(row.embedding);
    const score = cosineSimilarity(queryEmbedding, embedding);
    scored.push({
      id: row.id,
      path: row.path,
      source: row.source,
      start_line: row.start_line,
      end_line: row.end_line,
      text: row.text,
      model: row.model,
      score
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
