import { Show, useMemo, useState } from "@bunnix/core";
import {
  Container,
  HStack,
  Sidebar,
  VStack
} from "@bunnix/components";
import SettingsGeneralPage from "../pages/SettingsGeneralPage";
import SettingsNotificationsPage from "../pages/SettingsNotificationsPage";
import SettingsProviderPage from "../pages/SettingsProviderPage";
import SettingsMemoryPage from "../pages/SettingsMemoryPage";
import SettingsSkillsPage from "../pages/SettingsSkillsPage";

const sidebarItems = [
  { id: "general", label: "General", icon: "icon-gear" },
  { id: "notifications", label: "Notifications", icon: "icon-bell" },
  { id: "providers", isHeader: true, label: "Providers" },
  { id: "provider-anthropic", label: "Anthropic" },
  { id: "provider-claude-code", label: "Claude Code" },
  { id: "provider-openai-codex", label: "OpenAI Codex" },
  { id: "provider-ollama", label: "Ollama" },
  { id: "memory-skills", isHeader: true, label: "Memory & Skills" },
  { id: "memory", label: "Memory", icon: "icon-cube" },
  { id: "skills", label: "Skills", icon: "icon-lamp" },
];

export default function SettingsDialog() {
  const selectedItem = useState("provider-claude-code");
  const providerId = useMemo([selectedItem],
    (selected) => selected.includes("provider") ?
      selected.replace("provider-", "")
      : null
  );

  const isProvider = useMemo([selectedItem], (selected) => selected.includes("provider"));
  const showGeneral = useMemo([selectedItem], (selected) => selected === "general");
  const showNotifications = useMemo([selectedItem], (selected) => selected === "notifications");
  const showMemory = useMemo([selectedItem], (selected) => selected === "memory");
  const showSkills = useMemo([selectedItem], (selected) => selected === "skills");

  const handleSelection = (id) => {
    selectedItem.set(id);
  };

  return HStack(
    {
      verticalAlignment: "top"
    },
    Sidebar({
      items: sidebarItems,
      selection: selectedItem,
      onItemSelect: handleSelection
    }),
    Container(
      {
        type: "page",
        direction: "column",
        class: "w-full"
      },
      VStack(
        { alignment: "leading" },
        Show(showGeneral, () => SettingsGeneralPage()),
        Show(showNotifications, () => SettingsNotificationsPage()),
        Show(showMemory, () => SettingsMemoryPage()),
        Show(showSkills, () => SettingsSkillsPage()),
        Show(
          isProvider,
          () => SettingsProviderPage({ providerId })
        ),
      ),
    ),
  );
}
