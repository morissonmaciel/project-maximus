import Bunnix, { Show, useMemo } from "@bunnix/core";
import { Table, VStack, Text, Icon, Button } from "@bunnix/components";
import { providersConfig } from "../state/config";
import { providersCatalog } from "../state/catalog";
import { send } from "../ws/client";

export default function ProviderModelsPanel({ providerId }) {
  const provider = useMemo([providersCatalog, providerId], (catalog, id) => {
    if (!catalog) return null;
    return catalog.find((p) => p.id === id) || null;
  });

  const providerConfig = useMemo([providersConfig, providerId], (cfg, id) => {
    if (!cfg) return null;
    return cfg[id] || null;
  });

  const models = useMemo([provider, providerConfig], (p, cfg) => {
    if (!p) return [];
    return (
      p.models?.map((m) => ({
        id: m,
        providerId: p.id,
        inUse: cfg?.preferredModel === m,
      })) ?? []
    );
  });

  const providerName = useMemo([provider], (p) => {
    if (!p) return null;
    return p.label;
  });

  const handleChangeModel = (modelId) => {
    send({ type: "setModel", model: modelId, provider: providerId.get() });
  }

  return VStack(
    {},
    Table({
      columns: [
        { label: "Model", field: "id" },
        { label: "In Use", field: "in-use", size: "50px" },
        { label: "Actions", field: "actions", size: "1%" },
      ],
      renderCell: (_, prop, row, col) => {
        if (col.field === "in-use") {
          return row.inUse
            ? Icon({
                name: "check",
                fill: "default",
                size: "small",
                style: "--accent-color: green",
              })
            : null;
        }

        if (col.field === "actions") {
          return Button({
            variant: "flat",
            size: "small",
            onClick: () => handleChangeModel(row.id),
          }, "Select");
        }

        return row[prop];
      },
      key: "id",
      data: models,
      variant: "bordered",
      hideHeaders: true,
    }),
    Show(providerName, () =>
      Text(
        { type: "h6", color: "secondary" },
        `Select one of the supported models for ${providerName.get()} to make it as default.`,
      ),
    ),
  );
}
