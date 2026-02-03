import { useMemo } from "@bunnix/core";
import { Button, Table, Text } from "@bunnix/components";
import { providersConfig } from "../state/config";
import { providersCatalog } from "../state/catalog";

export function ProviderAuthStatePanel({ providerId }) {
  const provider = useMemo([providersCatalog, providerId], (catalog, id) => {
    if (!id || !catalog) return null;
    return catalog.find((provider) => provider.id === id) ?? null;
  });

  const providerConfig = useMemo([providersConfig, providerId], (cfg, id) => {
    if (!id || !cfg) return null;
    return cfg[id] ?? null;
  });

  const row = useMemo([providerId, provider, providerConfig], (id, item, cfg) => {
    const label = item?.label || item?.name || item?.id || id || "Provider";
    return {
      id: id ?? label,
      provider: label,
      status: cfg?.configured ? "Configured" : "Not Configured",
      actions: "Edit",
    };
  });

  return Table({
    columns: [
      { field: "provider", label: "Provider" },
      { field: "status", label: "Status", size: "140px" },
      { field: "actions", label: "Actions", size: "1%" },
    ],
    data: row.map((value) => [value]),
    renderCell: (_, prop, row, col) => {
      return col.field !== "actions"
        ? Text(row[prop])
        : Button({}, row["status"] === "Configured" ? "Change" : "Setup");
    },
    key: "id",
    variant: "bordered",
    hideHeaders: true
  });
}
