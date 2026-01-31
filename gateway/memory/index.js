import { createDatabase } from './db.js';
import { ingestText } from './ingestion.js';
import { searchSimilar } from './search.js';

export function createMemoryStore(options = {}) {
  const dbInstance = createDatabase(options);
  const { db, schemaInfo, ftsTable, getMeta, setMeta, listMessages, removeByPath, trimMessages } = dbInstance;

  return {
    db, // Expose db handle if needed
    schemaInfo,
    ftsTable, // Expose FTS table name for consistency
    getMeta,
    setMeta,
    listMessages,
    removeByPath: (pathValue) => removeByPath(pathValue, ftsTable, schemaInfo.ftsAvailable),
    trimMessages: (sessionId, keepLast) => trimMessages(sessionId, keepLast),
    getOnboardingSummary: () => dbInstance.getOnboardingSummary(),
    ingestText: (params) => ingestText({ db: dbInstance, params, ftsTable, ftsAvailable: schemaInfo.ftsAvailable }),
    searchSimilar: (params) => searchSimilar({ db, params, onStatus: params.onStatus, onState: params.onState })
  };
}
