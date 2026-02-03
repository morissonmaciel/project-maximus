import Bunnix, { useMemo } from "@bunnix/core";
import { HStack, ProgressBar, Table, Text, VStack } from "@bunnix/components";
import { providersConfig } from "../state/config";
import { formatRemainingTime } from "../utils/datetime-helpers";

export function ProviderLimitsPanel({ providerId }) {
  const provider = useMemo([providersConfig, providerId], (cfg, id) => {
    if (!cfg) return null;
    return cfg[id] || null;
  });

  const limits = useMemo([provider], (prov) => {
    let hourlyLimit = {
      id: "hour-limit",
      limit: "Hourly Limit",
      resetsAt: 0,
      value: 0,
      windowInMinutes: 0,
      hasData: false,
    };
    let weeklyLimit = {
      id: "week-limit",
      limit: "Weekly Limit",
      resetsAt: 0,
      value: 0,
      windowInMinutes: 0,
      hasData: false,
    };

    if (!prov) return [hourlyLimit, weeklyLimit];
    if (!prov.limits) return [hourlyLimit, weeklyLimit];

    if (prov.limits.daily) {
      hourlyLimit = {
        id: "hour-limit",
        limit: "Hourly Limit",
        resetsAt: prov.limits.daily.reset_after_seconds ?? 0,
        value: prov.limits.daily.used_percent ?? 0,
        windowInMinutes: prov.limits.daily.window_minutes ?? 0,
        hasData: true,
      };
    }

    if (prov.limits.weekly) {
      weeklyLimit = {
        id: "week-limit",
        limit: "Weekly Limit",
        resetsAt: prov.limits.weekly.reset_after_seconds ?? 0,
        value: prov.limits.weekly.used_percent ?? 0,
        windowInMinutes: prov.limits.weekly.window_minutes ?? 0,
        hasData: true,
      };
    }

    return [hourlyLimit, weeklyLimit];
  });

  return (
    VStack({},
      Table({
        columns: [
          { field: "limit", label: "Limit" },
          { field: "progress", label: "Progress", size: 140 },
          { field: "value", label: "Value", size: "1%" },
        ],
        data: limits,
        renderCell: (_, prop, row, col) => {
          if (col.field === "limit") return (
            HStack(
              {},
              Text(`${row.limit}`),
              Text(
                { color: "secondary" },
                row.hasData ? `Resets in ${formatRemainingTime(row.resetsAt ?? 0)}` : "No Data",
              ),
            )
          );

          if (col.field === "progress") return (
            ProgressBar({
              value: row.value,
              color: "primary-dimmed",
              size: "large",
            })
          );

          if (col.field === "value") return (
            Text(`${row.value}%`)
          );

          return null;
        },
        key: "id",
        variant: "bordered",
        hideHeaders: true,
      }),
      Text({ type: "h6", color: "secondary" }, "Use provider's model to update the Limits usage data.")
    )
  )
}
