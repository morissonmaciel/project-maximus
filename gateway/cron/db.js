import crypto from 'node:crypto';

export function createCronTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT,
      schedule TEXT,
      timezone TEXT,
      enabled INTEGER DEFAULT 1,
      max_retries INTEGER DEFAULT 3,
      retry_backoff_ms INTEGER DEFAULT 60000,
      payload TEXT,
      last_run_at INTEGER,
      next_run_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cron_runs (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      status TEXT,
      attempt INTEGER,
      started_at INTEGER,
      finished_at INTEGER,
      error TEXT,
      result TEXT
    );

    CREATE TABLE IF NOT EXISTS cron_events (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      run_id TEXT,
      type TEXT,
      message TEXT,
      created_at INTEGER,
      notified INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled);
    CREATE INDEX IF NOT EXISTS idx_cron_runs_job ON cron_runs(job_id);
    CREATE INDEX IF NOT EXISTS idx_cron_events_notified ON cron_events(notified);
  `);
}

export function listCronJobs(db) {
  return db.prepare('SELECT * FROM cron_jobs WHERE enabled = 1 ORDER BY created_at ASC;').all();
}

export function listAllCronJobs(db) {
  return db.prepare('SELECT * FROM cron_jobs ORDER BY created_at ASC;').all();
}

export function getCronJob(db, id) {
  return db.prepare('SELECT * FROM cron_jobs WHERE id = ? LIMIT 1;').get(id);
}

export function insertCronJob(db, job) {
  const now = Date.now();
  const id = job.id || crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO cron_jobs (
      id, name, schedule, timezone, enabled, max_retries, retry_backoff_ms,
      payload, last_run_at, next_run_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  stmt.run(
    id,
    job.name || 'Cron Job',
    job.schedule,
    job.timezone || null,
    job.enabled ? 1 : 0,
    job.max_retries ?? 3,
    job.retry_backoff_ms ?? 60000,
    job.payload ? JSON.stringify(job.payload) : null,
    job.last_run_at || null,
    job.next_run_at || null,
    now,
    now
  );
  return id;
}

export function updateCronJob(db, id, updates = {}) {
  const now = Date.now();
  const current = getCronJob(db, id);
  if (!current) return null;
  const payload = updates.payload !== undefined ? JSON.stringify(updates.payload) : current.payload;
  const stmt = db.prepare(`
    UPDATE cron_jobs
    SET name = ?, schedule = ?, timezone = ?, enabled = ?, max_retries = ?, retry_backoff_ms = ?,
        payload = ?, last_run_at = ?, next_run_at = ?, updated_at = ?
    WHERE id = ?;
  `);
  stmt.run(
    updates.name ?? current.name,
    updates.schedule ?? current.schedule,
    updates.timezone ?? current.timezone,
    updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : current.enabled,
    updates.max_retries ?? current.max_retries,
    updates.retry_backoff_ms ?? current.retry_backoff_ms,
    payload,
    updates.last_run_at ?? current.last_run_at,
    updates.next_run_at ?? current.next_run_at,
    now,
    id
  );
  return getCronJob(db, id);
}

export function insertCronRun(db, run) {
  const id = run.id || crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO cron_runs (id, job_id, status, attempt, started_at, finished_at, error, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `);
  stmt.run(
    id,
    run.job_id,
    run.status || 'running',
    run.attempt || 1,
    run.started_at || Date.now(),
    run.finished_at || null,
    run.error || null,
    run.result ? JSON.stringify(run.result) : null
  );
  return id;
}

export function updateCronRun(db, id, updates = {}) {
  const current = db.prepare('SELECT * FROM cron_runs WHERE id = ?;').get(id);
  if (!current) return null;
  const stmt = db.prepare(`
    UPDATE cron_runs
    SET status = ?, attempt = ?, started_at = ?, finished_at = ?, error = ?, result = ?
    WHERE id = ?;
  `);
  stmt.run(
    updates.status ?? current.status,
    updates.attempt ?? current.attempt,
    updates.started_at ?? current.started_at,
    updates.finished_at ?? current.finished_at,
    updates.error ?? current.error,
    updates.result ? JSON.stringify(updates.result) : current.result,
    id
  );
  return db.prepare('SELECT * FROM cron_runs WHERE id = ?;').get(id);
}

export function insertCronEvent(db, event) {
  const id = event.id || crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO cron_events (id, job_id, run_id, type, message, created_at, notified)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `);
  stmt.run(
    id,
    event.job_id,
    event.run_id,
    event.type || 'info',
    event.message,
    event.created_at || Date.now(),
    event.notified ? 1 : 0
  );
  return id;
}

export function listPendingCronEvents(db, limit = 10) {
  return db.prepare(
    'SELECT * FROM cron_events WHERE notified = 0 ORDER BY created_at ASC LIMIT ?;'
  ).all(limit);
}

export function markCronEventsNotified(db, ids = []) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`UPDATE cron_events SET notified = 1 WHERE id IN (${placeholders});`);
  const result = stmt.run(...ids);
  return result.changes || 0;
}

export function getRunningCronRun(db, jobId) {
  return db.prepare(
    "SELECT * FROM cron_runs WHERE job_id = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1;"
  ).get(jobId);
}
