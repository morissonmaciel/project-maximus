import { createCronTables, listCronJobs, listAllCronJobs, insertCronJob, updateCronJob, listPendingCronEvents, markCronEventsNotified, insertCronRun, updateCronRun, insertCronEvent, getRunningCronRun, getCronJob } from './db.js';
import { createScheduler, computeNextRun } from './scheduler.js';
import { runCronJob } from './runner.js';
import { formatCronEvents } from './formatter.js';

export function initCron({ memoryStore, getConfigState, onNotify }) {
  if (!memoryStore || !memoryStore.db) {
    return null;
  }

  const db = memoryStore.db;
  createCronTables(db);

  const scheduler = createScheduler({
    onRun: async (job) => {
      const configState = typeof getConfigState === 'function' ? getConfigState() : {};
      await runCronJob({
        job,
        db,
        memoryStore,
        configState,
        onNotify,
        createRun: (run) => insertCronRun(db, run),
        updateRun: (id, updates) => updateCronRun(db, id, updates),
        createEvent: (event) => insertCronEvent(db, event),
        updateJob: (id, updates) => updateCronJob(db, id, updates),
        getRunningRun: (id) => getRunningCronRun(db, id)
      });
    }
  });

  const jobs = listCronJobs(db);
  for (const job of jobs) {
    const nextRun = computeNextRun(job.schedule, job.timezone);
    updateCronJob(db, job.id, { next_run_at: nextRun });
    scheduler.scheduleJob(job);
  }

  return {
    scheduler,
    db,
    createJob: (job) => {
      const id = insertCronJob(db, job);
      const created = getCronJob(db, id);
      const nextRun = computeNextRun(created.schedule, created.timezone);
      updateCronJob(db, id, { next_run_at: nextRun });
      scheduler.scheduleJob(created);
      return id;
    },
    updateJob: (id, updates) => {
      const updated = updateCronJob(db, id, updates);
      if (updated && updated.enabled) {
        scheduler.scheduleJob(updated);
      }
      if (updated && !updated.enabled) {
        scheduler.clearJob(updated.id);
      }
      return updated;
    },
    disableJob: (id) => {
      const updated = updateCronJob(db, id, { enabled: 0 });
      if (updated) scheduler.clearJob(id);
      return updated;
    },
    listJobs: () => listAllCronJobs(db),
    listPendingEvents: (limit) => listPendingCronEvents(db, limit),
    markEventsNotified: (ids) => markCronEventsNotified(db, ids),
    formatPendingEvents: (events) => formatCronEvents(events)
  };
}
