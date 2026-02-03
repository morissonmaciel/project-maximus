import { useMemo } from "@bunnix/core";
import { Container, VStack, PageSection, Text } from "@bunnix/components";
import { ProviderAuthStatePanel } from "../panels/ProviderAuthStatePanel";
import { ProviderLimitsPanel } from "../panels/ProviderLimitsPanel";
import ProviderModelsPanel from "../panels/ProviderModelsPanel";
import { settings } from "../state/settings";

export default function SettingsProviderPage({ providerId }) {
  const provider = useMemo([settings, providerId], (sett, id) => {
    if (!sett) return null;
    if (!sett.providers) return null;
    return sett.providers[id];
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
