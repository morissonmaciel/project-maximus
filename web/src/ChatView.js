import Bunnix, { ForEach, Show, useRef, useEffect } from "@bunnix/core";
import { messages, processingState, sessionStore } from "./state/session.js";
import { MessageItem } from "./components/MessageItem.js";
import {
  Button,
  Container,
  DropdownMenu,
  HStack,
  Icon,
  InputField,
  PopoverMenu,
  VStack,
} from "@bunnix/components";
import PromptInput from "./components/PromptInputField.js";
import dotsSpinnerSvg from "./images/dots-spinner.svg";

const { span } = Bunnix;

function ChatMessages() {
  const anchorRef = useRef(null);
  const msgs = messages.map((m) => m);
  const typing = processingState.map((state) => state === "processing");

  const handleScroll = () => {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  useEffect((state) => {
    if (!state) return;
    handleScroll();
  }, sessionStore.state);

  return Container({ class: "h-full overflow-y-auto p-md" }, [
    ForEach(msgs, "id", (msg) => MessageItem({ msg })),
    Show(typing, () =>
      span({ innerHTML: dotsSpinnerSvg })
    ),
    span({ ref: anchorRef }),
  ]);
}

export default function Chat() {
  return Container(
    { class: "h-full" },
    // Messages container
    ChatMessages(),
    // Prompt container
    PromptInput(),
  );
}
