import { Container, VStack, PageSection, Text } from "@bunnix/components";

export default function SettingsGeneralPage() {
  return Container(
    { type: "page", direction: "column", class: "w-full" },
    VStack({ alignment: "leading" }, Text({ type: "heading3" }, "General")),

    PageSection({ title: "Gateway Status"})
  );
}
