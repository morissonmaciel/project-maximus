import { createDatabase } from './db.js';
import { ingestText } from './ingestion.js';
import { searchSimilar } from './search.js';

export function createMemoryStore(options = {}) {
  const dbInstance = createDatabase(options);
  const { db, schemaInfo, ftsTable, getMeta, setMeta, listMessages, removeByPath, trimMessages, insertProviderStats, getLatestProviderStats, getLatestProviderStatsAnySession } = dbInstance;

  return {
    db, // Expose db handle if needed
    schemaInfo,
    ftsTable, // Expose FTS table name for consistency
    getMeta,
    setMeta,
    listMessages,
    removeByPath: (pathValue) => removeByPath(pathValue, ftsTable, schemaInfo.ftsAvailable),
    trimMessages: (sessionId, keepLast) => trimMessages(sessionId, keepLast),
    insertProviderStats: (sessionId, provider, usage, limits, accumulatedUsage) => insertProviderStats(sessionId, provider, usage, limits, accumulatedUsage),
    getLatestProviderStats: (sessionId, provider) => getLatestProviderStats(sessionId, provider),
    getLatestProviderStatsAnySession: (provider) => getLatestProviderStatsAnySession(provider),
    getOnboardingSummary: () => dbInstance.getOnboardingSummary(),
    getPermission: (tool, targetDir) => dbInstance.getPermission(tool, targetDir),
    setPermission: (tool, targetDir, params) => dbInstance.setPermission(tool, targetDir, params),
    listPermissions: (filters) => dbInstance.listPermissions(filters),
    checkPermission: (tool, targetPath) => dbInstance.checkPermission(tool, targetPath),
    removePermission: (tool, targetDir) => dbInstance.removePermission(tool, targetDir),
    ingestText: (params) => ingestText({ db: dbInstance, params, ftsTable, ftsAvailable: schemaInfo.ftsAvailable }),
    searchSimilar: (params) => searchSimilar({ db, params, onStatus: params.onStatus, onState: params.onState })
  };
}
