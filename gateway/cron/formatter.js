export function formatCronEvents(events = []) {
  if (!events.length) return '';
  const lines = events.map((evt, idx) => {
    const ts = new Date(evt.created_at).toISOString();
    const prefix = `# Cron Event ${idx + 1}`;
    return `${prefix} (${evt.job_id})\n[${ts}] ${evt.message}`;
  });
  return `The following scheduled events occurred:\n\n${lines.join('\n\n')}`;
}
