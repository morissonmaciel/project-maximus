import { useMemo } from "@bunnix/core";
import { Button, Table, Text } from "@bunnix/components";
import { connectionStore } from "../state/connection";

export function ProviderAuthStatePanel({ providerId }) {
  const provider = useMemo([connectionStore.state, providerId], (state, id) => {
    if (!id || !state.providerList) return null;
    return state.providerList.find((provider) => provider.id === id) ?? null;
  });

  const row = useMemo([providerId, provider], (id, item) => {
    const label = item?.label || item?.name || item?.id || id || "Provider";
    return {
      id: id ?? label,
      provider: label,
      status: item?.configured ? "Configured" : "Not Configured",
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
