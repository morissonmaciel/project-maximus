import Bunnix from "@bunnix/core";
import { HStack, Text, VStack } from "@bunnix/components";
import { renderMarkdown } from "../utils/helpers.js";

const { div } = Bunnix;

// Tool message content component (replaces raw HTML string builder)
function ToolMessageContent({ meta }) {
  const statusText =
    meta.status === "running"
      ? "Using"
      : meta.status === "success"
        ? "Used"
        : "Failed";
  const statusColor =
    statusText === "Using"
      ? "primary"
      : statusText === "Used"
        ? "accent"
        : "destructive";

  return VStack(
    { gap: "xsmall" },
    HStack(
      { gap: "xsmall" },
      Text(
        { weight: "bold", color: statusColor, style: "--accent-color: green" },
        statusText,
      ),
      " ",
      Text({ weight: "bold" }, meta.toolName),
    ),
    Text({ color: "secondary" }, meta.reason ? meta.reason : null),
  );
}

// Message Component
export function MessageItem({ msg }) {
  // Tool message rendering - uses same assistant avatar styling
  if (msg.meta?.type === "tool") {
    return HStack({ class: "message assistant" }, [
      Text({ class: "avatar" }, "M"),
      Text({ class: "content" }, ToolMessageContent({ meta: msg.meta })),
    ]);
  }

  if (msg.meta?.hidden) {
    return null;
  }

  if (msg.meta?.source === "cron") {
    return div(
      { class: "message user cron-message" },
      div({ class: "message-avatar" }, "$"),
      div(
        { class: "message-content" },
        div({ class: "cron-badge" }, "CRON EVENT"),
        div({ class: "cron-text", innerHTML: renderMarkdown(msg.content) }),
      ),
    );
  }

  // Regular message rendering
  return HStack({ class: `message ${msg.role}` }, [
    Text({ class: "avatar" }, msg.role === "user" ? "$" : "M"),
    Text({
      class: "content",
      weight: msg.role === "user" ? "semibold" : "regular",
      innerHTML: renderMarkdown(msg.content),
    }),
  ]);
}
