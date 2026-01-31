import { serializeEmbedding } from './chunking.js';

function nowMs() {
  return Date.now();
}

export function getCachedEmbedding(db, { providerId, model, providerKey, hash }) {
  // Validate parameters before binding to SQLite
  if (!hash || typeof hash !== 'string') {
    return null;
  }
  const stmt = db.prepare(
    `SELECT embedding, dims FROM embedding_cache WHERE provider = ? AND model = ? AND provider_key = ? AND hash = ?;`
  );
  const row = stmt.get(providerId, model, providerKey, hash);
  if (!row) return null;
  return {
    embedding: row.embedding,
    dims: row.dims
  };
}

export function setCachedEmbedding(db, { providerId, model, providerKey, hash, embedding }) {
  // Validate parameters before binding to SQLite
  if (!hash || typeof hash !== 'string') {
    return;
  }
  if (!embedding || !Array.isArray(embedding)) {
    return;
  }
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO embedding_cache (provider, model, provider_key, hash, embedding, dims, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`
  );
  const buffer = serializeEmbedding(embedding);
  stmt.run(providerId, model, providerKey, hash, buffer, embedding.length, nowMs());
}
