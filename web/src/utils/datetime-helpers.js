export function formatRemainingTime(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return "--";
  }

  const seconds = Math.max(0, Math.floor(Number(totalSeconds)));

  if (seconds < 60) {
    return formatUnit(seconds, "second");
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return formatUnit(minutes, "minute");
  }

  const hours = Math.ceil(seconds / 3600);
  if (hours < 24) {
    return formatUnit(hours, "hour");
  }

  const days = Math.ceil(seconds / 86400);
  return formatUnit(days, "day");
}

function formatUnit(value, unit) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}
