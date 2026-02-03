import { Container, VStack, PageSection, Text } from "@bunnix/components";

export default function SettingsSkillsPage() {
  return Container(
    { type: "page", direction: "column", class: "w-full" },
    VStack({ alignment: "leading" }, Text({ type: "heading3" }, "Skills")),
    PageSection({ title: "Skill Management" }),
  );
}
