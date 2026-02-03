import Bunnix from "@bunnix/core";
import { openSettings } from "../state/config.js";
import LogoSmall from "../images/maximus-small.png";
import { Button, HStack, Icon, NavigationBar, showDialog, Text } from "@bunnix/components";
import SettingsDialog from "../dialogs/SettingsDialog.js";

const { img } = Bunnix;

// Status Header Component
export function Header() {
  const handleSettingsClick = () => {
    showDialog({
      title: "Settings",
      minWidth: 1024,
      minHeight: 768,
      content: () => SettingsDialog()
    })
    openSettings();
  };

  return NavigationBar({
    leading: () =>
      HStack({}, [
        img({ src: LogoSmall, alt: "Maximus Logo", class: "main-logo" }),
        Text({ type: "heading2" }, "Maximus"),
      ]),
    trailing: () =>
      HStack({}, [
        Button({ variant: "flat" }, Icon({ name: "bell" })),
        Button({ onClick: handleSettingsClick }, "Settings"),
      ]),
  });
}
