import Bunnix, { useMemo, useState } from "@bunnix/core";
import {
  Button,
  Container,
  HStack,
  Icon,
  InputField,
  PopoverMenu,
  VStack,
} from "@bunnix/components";
import { isConnected } from "../state/connection";
import { addMessage, isTyping } from "../state/messages";
import { send } from "../lib/websocket";

const attachmentOptions = [
  { id: "file", title: "File", icon: "icon-file" },
  { id: "image", title: "Image", icon: "icon-image" },
];

const { form } = Bunnix;

export default function PromptInputField() {
  const inputValue = useState("");
  const busy = useMemo([isTyping, isConnected], (typing, connected) => {
    return !connected || (connected && typing);
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputValue.get().trim();
    if (!text || busy.get()) return;

    addMessage("user", text);
    send({ type: "chat", messages: [{ role: "user", content: text }] });
    inputValue.set("");
  };

  return form(
    { class: "p-md", submit: handleSubmit },
    VStack(
      {},
      HStack(
        { gap: "small", class: "w-full" },
        PopoverMenu({
          menuItems: attachmentOptions,
          trigger: () => Icon({ name: "clip" }),
          disabled: busy,
        }),
        Container(
          { class: "flex-1" },
          InputField({
            id: "prompt-field",
            placeholder: "Ask anything...",
            disabled: busy,
            input: (e) => inputValue.set(e.target.value),
            value: inputValue,
          }),
        ),
        Button({ disabled: busy }, Icon({ name: "send", class: "icon-white" })),
      ),
    ),
  );
}
