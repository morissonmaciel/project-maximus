import crypto from 'node:crypto';
import { computeNextRun, parseSchedule } from './scheduler.js';

function formatInTimeZone(date, timeZone) {
  if (!timeZone) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = fmt.formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  } catch {
    return null;
  }
}

function parsePayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try { return JSON.parse(payload); } catch { return { message: payload }; }
  }
  return payload;
}

// Assistant generation removed: cron now triggers main session model via onNotify

export async function runCronJob({ job, db, memoryStore, configState, onNotify, createRun, updateRun, createEvent, updateJob, getRunningRun }) {
  const running = getRunningRun(job.id);
  if (running) return { skipped: true };

  console.log(`[Cron] Running job "${job.name}" (${job.id})`);

  const payload = parsePayload(job.payload);
  const notifyMode = payload.notify || 'both';
  const sessionId = payload.sessionId || configState.lastSessionId || 'cron';
  const friendlyName = job.name || 'Cron Job';
  const scheduledLabel = job.schedule || 'unspecified';
  const tzLabel = job.timezone ? ` (${job.timezone})` : '';
  const executedAtDate = new Date();
  const executedAt = executedAtDate.toISOString();
  const executedAtLocal = formatInTimeZone(executedAtDate, job.timezone);
  const purpose = payload.message || payload.reason || `Cron job "${friendlyName}" executed.`;
  const message = [
    '[CRON EVENT]',
    `Job: ${friendlyName}`,
    `Schedule: ${scheduledLabel}${tzLabel}`,
    `ExecutedAt: ${executedAt}`,
    executedAtLocal ? `ExecutedAtLocal: ${executedAtLocal} ${job.timezone}` : null,
    `Message: ${purpose}`,
    '[/CRON EVENT]'
  ].filter(Boolean).join('\n');

  const runId = createRun({
    id: crypto.randomUUID(),
    job_id: job.id,
    status: 'running',
    attempt: 1,
    started_at: Date.now()
  });

  let success = true;
  let error = null;
  let result = null;

  try {
    // No-op for assistant notify; handled via onNotify to trigger main session model
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
  }

  if (!success && job.max_retries > 1) {
    // Retry logic: schedule a retry after backoff
    const delay = job.retry_backoff_ms || 60000;
    setTimeout(async () => {
      try {
        await runCronJob({
          job: { ...job, max_retries: (job.max_retries - 1) },
          db,
          memoryStore,
          configState,
          createRun,
          updateRun,
          createEvent,
          updateJob,
          getRunningRun
        });
      } catch {
        // swallow retry errors
      }
    }, delay);
  }

  updateRun(runId, {
    status: success ? 'success' : 'failed',
    finished_at: Date.now(),
    error,
    result
  });

  console.log(`[Cron] Job "${job.name}" completed (${success ? 'success' : 'failed'})`);

  const eventMessage = success
    ? message
    : [
        '[CRON EVENT]',
        `Job: ${friendlyName}`,
        `Schedule: ${scheduledLabel}${tzLabel}`,
        `ExecutedAt: ${executedAt}`,
        executedAtLocal ? `ExecutedAtLocal: ${executedAtLocal} ${job.timezone}` : null,
        `Message: Cron job failed: ${error || 'unknown error'}`,
        '[/CRON EVENT]'
      ].filter(Boolean).join('\n');

  const eventId = createEvent({
    job_id: job.id,
    run_id: runId,
    type: success ? 'info' : 'error',
    message: eventMessage,
    created_at: Date.now(),
    notified: 0
  });

  if (memoryStore) {
    const path = `docs:cron/${job.id}/${runId}`;
    await memoryStore.ingestText({
      sessionId,
      provider: configState.provider || 'cron',
      role: 'system',
      text: eventMessage,
      source: 'system',
      path,
      meta: { hidden: true, source: 'cron', jobName: friendlyName }
    });
  }

  if ((notifyMode === 'assistant' || notifyMode === 'both') && typeof onNotify === 'function') {
    try {
      await onNotify({ sessionId, text: message, jobName: friendlyName });
    } catch {
      // ignore notification failures
    }
  }

  updateJob(job.id, {
    last_run_at: Date.now(),
    next_run_at: computeNextRun(job.schedule, job.timezone)
  });

  const parsedSchedule = parseSchedule(job.schedule);
  if (parsedSchedule?.type === 'at') {
    updateJob(job.id, { enabled: 0 });
  }

  return { success, eventId, runId };
}
