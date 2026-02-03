import { Container, VStack, PageSection, Text } from "@bunnix/components";

export default function SettingsNotificationsPage() {
  return Container(
    { type: "page", direction: "column", class: "w-full" },
    VStack({ alignment: "leading" }, Text({ type: "heading3" }, "Notifications")),
    PageSection({ title: "Preferences" }),
  );
}
