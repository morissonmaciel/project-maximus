import { hashText, chunkTextByLines, serializeEmbedding, deserializeEmbedding } from './chunking.js';
import { getEmbeddingProvider } from './embeddings.js';
import { getCachedEmbedding, setCachedEmbedding } from './cache.js';

export async function ingestText({
  db,
  params,
  ftsTable,
  ftsAvailable
}) {
  const { sessionId, provider, role, text, meta } = params;
  if (!text || !sessionId) return;

  db.insertSession(sessionId, provider);
  db.insertMessage(sessionId, role, text, meta);

  const source = params.source || 'chat';
  const pathValue = params.path || `${source}:${sessionId}`;
  const textHash = hashText(text);
  db.upsertFileRow(pathValue, source, text, textHash);

  let providerInstance;
  try {
    providerInstance = await getEmbeddingProvider(params.onStatus, params.onState);
  } catch (err) {
    // If embedding provider fails, we still inserted the text, so we can stop here.
    return;
  }

  const providerId = providerInstance.id;
  const model = providerInstance.model;
  const providerKey = 'node-llama-cpp'; // Or some other key if we support more providers

  const chunks = chunkTextByLines(text);
  for (const chunk of chunks) {
    try {
      const chunkHash = hashText(chunk.text);
      const cached = getCachedEmbedding(db.db, { providerId, model, providerKey, hash: chunkHash });
      let embedding;
      if (cached) {
        embedding = deserializeEmbedding(cached.embedding);
      } else {
        embedding = await providerInstance.embedQuery(chunk.text);
        setCachedEmbedding(db.db, { providerId, model, providerKey, hash: chunkHash, embedding });
      }

      const id = hashText(`${pathValue}:${chunk.start_line}:${chunk.end_line}:${chunkHash}`);
      db.insertChunk({
        id,
        path: pathValue,
        source,
        start_line: chunk.start_line,
        end_line: chunk.end_line,
        hash: chunkHash,
        model,
        text: chunk.text,
        embedding: serializeEmbedding(embedding)
      }, ftsTable, ftsAvailable);
    } catch (err) {
      // Swallow embedding errors - tool history is already stored above
      console.warn(`[Memory] Embedding chunk failed: ${err.message}`);
    }
  }
}
