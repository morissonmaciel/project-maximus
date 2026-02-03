import { useMemo } from "@bunnix/core";
import { Container, VStack, PageSection, Text } from "@bunnix/components";
import { ProviderAuthStatePanel } from "../panels/ProviderAuthStatePanel";
import { ProviderLimitsPanel } from "../panels/ProviderLimitsPanel";
import ProviderModelsPanel from "../panels/ProviderModelsPanel";
import { providersCatalog } from "../state/catalog";

export default function SettingsProviderPage({ providerId }) {
  const provider = useMemo([providersCatalog, providerId], (catalog, id) => {
    if (!catalog) return null;
    return catalog.find((p) => p.id === id) || null;
  });

  const providerName = useMemo([provider], (p) => {
    if (!p) return null;
    return p.label;
  });

  return Container(
    { type: "page", direction: "column", class: "w-full" },
    VStack({ alignment: "leading" }, Text({ type: "heading3" }, providerName)),

    PageSection(
      { title: "Authorization" },
      ProviderAuthStatePanel({ providerId }),
    ),
    PageSection(
      { title: "Supported Models" },
      ProviderModelsPanel({ providerId }),
    ),
    PageSection({ title: "Limits" },
      ProviderLimitsPanel({ providerId })),
  );
}
