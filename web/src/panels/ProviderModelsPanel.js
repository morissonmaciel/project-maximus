import Bunnix, { Show, useMemo } from "@bunnix/core";
import { Table, VStack, Text, Icon, Button } from "@bunnix/components";
import { settings, updateProviders } from "../state/settings";
import { selectModel } from "../state/models";

export default function ProviderModelsPanel({ providerId }) {
  const provider = useMemo([settings, providerId], (sett, id) => {
    if (!sett) return null;
    if (!sett.providers) return null;
    return sett.providers[id];
  });

  const models = useMemo([provider], (p) => {
    if (!p) return [];
    return (
      p.models?.map((m) => ({
        id: m,
        providerId: p.id,
        inUse: p.preferredModel === m,
      })) ?? []
    );
  });

  const providerName = useMemo([provider], (p) => {
    if (!p) return null;
    return p.label;
  });

  const handleChangeModel = (modelId) => {
    selectModel(modelId, providerId.get());
    updateProviders();
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
