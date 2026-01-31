import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TABLES = {
  embeddingCache: 'embedding_cache',
  fts: 'chunks_fts'
};

const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertTableName(name) {
  if (!TABLE_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
}

function ensureColumn(db, table, column, definition) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  if (rows.some((row) => row.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function ensureMemoryIndexSchema(params) {
  const embeddingCacheTable = params.embeddingCacheTable || DEFAULT_TABLES.embeddingCache;
  const ftsTable = params.ftsTable || DEFAULT_TABLES.fts;
  const ftsEnabled = params.ftsEnabled !== false;

  assertTableName(embeddingCacheTable);
  assertTableName(ftsTable);

  params.db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  params.db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      path TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'memory',
      hash TEXT NOT NULL,
      mtime INTEGER NOT NULL,
      size INTEGER NOT NULL
    );
  `);
  params.db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'memory',
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      hash TEXT NOT NULL,
      model TEXT NOT NULL,
      text TEXT NOT NULL,
      embedding BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  params.db.exec(`
    CREATE TABLE IF NOT EXISTS ${embeddingCacheTable} (
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      provider_key TEXT NOT NULL,
      hash TEXT NOT NULL,
      embedding BLOB NOT NULL,
      dims INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (provider, model, provider_key, hash)
    );
  `);
  params.db.exec(
    `CREATE INDEX IF NOT EXISTS idx_embedding_cache_updated_at ON ${embeddingCacheTable}(updated_at);`
  );

  let ftsAvailable = false;
  let ftsError;
  if (ftsEnabled) {
    try {
      params.db.exec(
        `CREATE VIRTUAL TABLE IF NOT EXISTS ${ftsTable} USING fts5(\n` +
          `  text,\n` +
          `  id UNINDEXED,\n` +
          `  path UNINDEXED,\n` +
          `  source UNINDEXED,\n` +
          `  model UNINDEXED,\n` +
          `  start_line UNINDEXED,\n` +
          `  end_line UNINDEXED\n` +
          `);`
      );
      ftsAvailable = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ftsAvailable = false;
      ftsError = message;
    }
  }

  ensureColumn(params.db, 'files', 'source', "TEXT NOT NULL DEFAULT 'memory'");
  ensureColumn(params.db, 'chunks', 'source', "TEXT NOT NULL DEFAULT 'memory'");
  params.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path);');
  params.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source);');
  
  params.db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  params.db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  params.db.exec('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);');


  return { ftsAvailable, ...(ftsError ? { ftsError } : {}) };
}


function ensureDbDirectory(dbPath) {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
}

export function createDatabase(options = {}) {
  const dbPath = options.dbPath || ':memory:';
  if (dbPath !== ':memory:') {
    ensureDbDirectory(dbPath);
  }
  const db = new DatabaseSync(dbPath);
  const ftsTable = options.ftsTable || DEFAULT_TABLES.fts;
  const schemaInfo = ensureMemoryIndexSchema({
    db,
    embeddingCacheTable: options.embeddingCacheTable,
    ftsTable,
    ftsEnabled: options.ftsEnabled
  });

  const getMeta = (key) => {
    const stmt = db.prepare('SELECT value FROM meta WHERE key = ?;');
    const row = stmt.get(key);
    return row?.value || null;
  };

  const setMeta = (key, value) => {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);'
    );
    stmt.run(key, value);
  };
  
  const insertSession = (sessionId, provider) => {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO sessions (id, provider, created_at) VALUES (?, ?, ?);'
    );
    stmt.run(sessionId, provider, Date.now());
  };

  const insertMessage = (sessionId, role, content) => {
    const stmt = db.prepare(
      'INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?);'
    );
    stmt.run(crypto.randomUUID(), sessionId, role, content, Date.now());
  };
  
  const upsertFileRow = (pathValue, source, content, hash) => {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO files (path, source, hash, mtime, size) VALUES (?, ?, ?, ?, ?);`
    );
    stmt.run(pathValue, source, hash, Date.now(), content.length);
  };

  const insertChunk = (chunk, ftsTable, ftsAvailable) => {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO chunks
        (id, path, source, start_line, end_line, hash, model, text, embedding, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
    );
    stmt.run(
      chunk.id,
      chunk.path,
      chunk.source,
      chunk.start_line,
      chunk.end_line,
      chunk.hash,
      chunk.model,
      chunk.text,
      chunk.embedding,
      Date.now()
    );

    // Defensive guard: only insert to FTS if available AND table name is valid
    if (ftsAvailable && ftsTable && typeof ftsTable === 'string') {
      const ftsStmt = db.prepare(
        `INSERT OR REPLACE INTO ${ftsTable} (text, id, path, source, model, start_line, end_line)
         VALUES (?, ?, ?, ?, ?, ?, ?);`
      );
      ftsStmt.run(
        chunk.text,
        chunk.id,
        chunk.path,
        chunk.source,
        chunk.model,
        chunk.start_line,
        chunk.end_line
      );
    }
  };

  const removeByPath = (pathValue, ftsTable, ftsAvailable) => {
    const stmtChunks = db.prepare('DELETE FROM chunks WHERE path = ?;');
    stmtChunks.run(pathValue);

    const stmtFiles = db.prepare('DELETE FROM files WHERE path = ?;');
    stmtFiles.run(pathValue);

    // Defensive guard: only delete from FTS if available AND table name is valid
    if (ftsAvailable && ftsTable && typeof ftsTable === 'string') {
      const stmtFts = db.prepare(`DELETE FROM ${ftsTable} WHERE path = ?;`);
      stmtFts.run(pathValue);
    }
  };

  const listMessages = (sessionId) => {
    const stmt = db.prepare(
      'SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC;'
    );
    return stmt.all(sessionId);
  };

  const trimMessages = (sessionId, keepLast) => {
    // Get IDs of messages to keep (the most recent keepLast messages of any role)
    const keepStmt = db.prepare(
      `SELECT id FROM messages
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    );
    const keepIds = keepStmt.all(sessionId, keepLast).map(row => row.id);

    if (keepIds.length === 0) {
      // No messages to keep, delete all messages for this session
      const deleteAllStmt = db.prepare(
        `DELETE FROM messages
         WHERE session_id = ?`
      );
      const result = deleteAllStmt.run(sessionId);
      return { deleted: result.changes, kept: 0 };
    }

    // Delete messages not in the keep list
    const placeholders = keepIds.map(() => '?').join(',');
    const deleteStmt = db.prepare(
      `DELETE FROM messages
       WHERE session_id = ?
       AND id NOT IN (${placeholders})`
    );
    const result = deleteStmt.run(sessionId, ...keepIds);
    return { deleted: result.changes, kept: keepIds.length };
  };

  const getOnboardingSummary = (sessionId) => {
    // Query chunks table for onboarding summary content
    // Path pattern: docs:onboarding/summary
    const stmt = db.prepare(
      `SELECT text FROM chunks
       WHERE path = 'docs:onboarding/summary'
       ORDER BY updated_at DESC
       LIMIT 1;`
    );
    const row = stmt.get();
    return row?.text || null;
  };

  return { db, schemaInfo, ftsTable, getMeta, setMeta, insertSession, insertMessage, upsertFileRow, insertChunk, removeByPath, listMessages, trimMessages, getOnboardingSummary };
}
