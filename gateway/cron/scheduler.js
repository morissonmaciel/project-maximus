import cron from 'node-cron';
import cronParser from 'cron-parser';

function parseInterval(value) {
  const match = String(value || '').trim().match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * (multipliers[unit] || 0);
}

export function parseSchedule(schedule) {
  if (!schedule || typeof schedule !== 'string') return null;
  if (schedule.startsWith('cron:')) {
    return { type: 'cron', expr: schedule.slice(5).trim() };
  }
  if (schedule.startsWith('interval:')) {
    return { type: 'interval', intervalMs: parseInterval(schedule.slice(9).trim()) };
  }
  if (schedule.startsWith('at:')) {
    const ts = Date.parse(schedule.slice(3).trim());
    return { type: 'at', runAt: Number.isNaN(ts) ? null : ts };
  }
  return null;
}

export function computeNextRun(schedule, timezone) {
  const parsed = parseSchedule(schedule);
  if (!parsed) return null;
  if (parsed.type === 'interval') {
    return Date.now() + (parsed.intervalMs || 0);
  }
  if (parsed.type === 'at') {
    return parsed.runAt;
  }
  if (parsed.type === 'cron') {
    try {
      const iter = cronParser.parseExpression(parsed.expr, timezone ? { tz: timezone } : {});
      return iter.next().getTime();
    } catch {
      return null;
    }
  }
  return null;
}

export function createScheduler({ onRun }) {
  const cronTasks = new Map();
  const intervalTasks = new Map();
  const timeoutTasks = new Map();

  function clearJob(id) {
    const cronTask = cronTasks.get(id);
    if (cronTask) cronTask.stop();
    cronTasks.delete(id);

    const interval = intervalTasks.get(id);
    if (interval) clearInterval(interval);
    intervalTasks.delete(id);

    const timeout = timeoutTasks.get(id);
    if (timeout) clearTimeout(timeout);
    timeoutTasks.delete(id);
  }

  function scheduleJob(job) {
    clearJob(job.id);
    const parsed = parseSchedule(job.schedule);
    if (!parsed) return;

    if (parsed.type === 'cron') {
      const task = cron.schedule(parsed.expr, () => onRun(job), {
        timezone: job.timezone || undefined
      });
      cronTasks.set(job.id, task);
      return;
    }

    if (parsed.type === 'interval' && parsed.intervalMs) {
      const interval = setInterval(() => onRun(job), parsed.intervalMs);
      intervalTasks.set(job.id, interval);
      return;
    }

    if (parsed.type === 'at' && parsed.runAt) {
      const delay = Math.max(0, parsed.runAt - Date.now());
      const timeout = setTimeout(() => onRun(job), delay);
      timeoutTasks.set(job.id, timeout);
    }
  }

  return { scheduleJob, clearJob };
}
