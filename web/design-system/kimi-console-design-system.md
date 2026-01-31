# Kimi Console UI - Design System Extraction

Source: Screenshot of Kimi Code console panel (2026-01-31).

## Overall Layout
- Page is light theme, high whitespace, centered content column.
- Top global nav with brand at left, secondary nav items right.
- Main content in a single column with stacked sections.
- Card grids and tables use consistent rounded corners and subtle borders.
- Docs pages use a 3-column layout: left sidebar nav, center content, right “On this page” TOC.

## Typography
- Primary typeface: modern sans-serif (likely system or a clean web sans). No serif usage.
- Headings:
  - Page title "Console" appears as medium weight, around 16-18px.
  - Section headers ("API Keys", "Login Devices", "Usage History") around 14-16px, semi-bold.
- Body text:
  - Default copy ~12-13px, regular weight.
  - Muted helper text ~11-12px, lighter gray.
- Table text:
  - Header row small, medium weight, ~11-12px.
  - Body rows regular, ~11-12px.
- Button text:
  - Small label, ~11-12px, medium weight.

## Color Palette (approx)
- Background: #FFFFFF
- Panel/card background: #FFFFFF
- Subtle card background in info callouts: #F7F7F7 to #F9F9F9
- Border: #E6E6E6 to #EDEDED
- Primary text: #222222 to #2A2A2A
- Secondary text: #6B6B6B to #777777
- Muted text: #9A9A9A to #A6A6A6
- Accent (success status): #38A169 to #45B36B
- Button (primary dark): #111111 to #1A1A1A
- Button text: #FFFFFF
- Badge/label background: very light gray (#F2F2F2)

## Spacing and Rhythm
- Global gutters: large, approx 32-40px left/right from window edge.
- Vertical section spacing: ~24-32px between section blocks.
- Card grid gap: ~12-16px between cards.
- Inside cards: padding ~16px (top/bottom), ~18px (sides).
- Table rows: ~12-14px vertical padding.
- Buttons: height ~28-32px, horizontal padding ~12-16px.

## Components

### Top Navigation
- Left: brand wordmark "KIMI" + "Code".
- Right: links (Member benefits, Document, Console), plus avatar dropdown.
- Links are light/medium gray; active link darker.

ASCII spec (layout + spacing, approximate):
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [KIMI] Code                             Member benefits  Document  Console  │
│                                                                    (avatar)  │
└──────────────────────────────────────────────────────────────────────────────┘
Padding: 12px top/bottom, 20px left/right
Nav item gap: ~16px
```

### Docs Sidebar (from Captura de Tela 2026-01-31 às 10.03.00)
- Left sidebar with nested sections and thin dividers between groups.
- Active item uses darker text and a subtle vertical emphasis (weight/contrast).
- Indentation for sub-items ~12–16px.
- Sidebar width ~220–240px (approx 232px measured by visual proportion).
- Section group titles slightly bolder than items.
- Sidebar background: white, no heavy shadow.

ASCII spec:
```
┌────────────────────────────┐
│ Kimi Code Docs             │  (section label)
│  Kimi Code                 │
│  Kimi Code Membership      │
│  Benefits                  │
│  Benefit Description       │
│ ───────────────────────── │  (divider)
│ Kimi Code CLI Guide        │  (section label)
│   Getting Started          │
│   Common Use Cases         │
│   Interaction and Input    │
│   Sessions and Context     │
│   Using in IDEs            │  (active)
│   Integrations with Tools  │
│   Customization and More   │
│ ───────────────────────── │
│ Kimi Code for VS Code Guide│
│   Getting Started          │
│ ───────────────────────── │
│ More                       │
│   Use in Third-Party ...   │
└────────────────────────────┘
```
Spacing:
- Section label margin-top: 12–16px
- Item row height: ~22–26px
- Divider margin: 10–12px vertical
- Sidebar horizontal padding: ~16px
- Sub-item indent: ~14px

Active state:
- Text color: near #222222
- Weight: medium
- Left padding remains consistent (no bold icon)

### Section Title
- Simple text header with no underline.
- Minimal spacing above/below.

### Stat Cards (4 small cards)
- Layout: 4 cards in a row.
- Rounded corners ~8px.
- Border: 1px light gray.
- Content:
  - Label top-left in muted text.
  - Large value line (e.g., 68%, 21%).
  - Subtext in muted text.
  - Progress bar (black fill, gray track), thin height.

### Tooltip (Info)
- Appears as dark bubble with arrow and rounded corners.
- Text in white, medium weight.
- Shadow minimal.

ASCII spec:
```
        ┌────────────────────────────────────────┐
        │ Your maximum usage limit per 5 hours. │
        └───────────────┬────────────────────────┘
                        ▼
```
Bubble radius: ~10px
Padding: 10–12px vertical, 14–16px horizontal
Background: #1C1C1C to #222222
Text: #FFFFFF

ASCII spec (single card):
```
┌──────────────────────────────┐
│ Weekly usage   (i)           │  padding: 16px
│                              │  label: 11-12px muted
│  68%                          │  value: 16-18px semi-bold
│  Resets in 130 hours          │  subtext: 11-12px muted
│  ████████░░░░░░░░             │  bar: 4-6px height
└──────────────────────────────┘
Card radius: 8px
Card border: 1px #E6E6E6
Gap between cards: 12-16px
```

### API Keys Panel
- Section header + inline right-aligned button ("+ Create new API Key").
- Button:
  - Dark fill, white text, rounded ~14px pill.
  - Small plus icon + label.
- Info callout:
  - Light gray background, rounded ~8px, body text.
- Table:
  - Light border, rounded corners.
  - Header row with labels: API ID, Name, Create time, Key, Status, Action.
  - Row divider lines in very light gray.
  - Status text appears in regular gray ("Enabled").
  - Action icons are minimal line icons (edit, delete).

### Modal (Create API Key)
- Centered dialog, medium width, rounded corners.
- Background overlay dims page (approx 40–50% black).
- Header row: title left, close icon right.
- Input field: full width, rounded, light gray background.
- Actions: secondary “Cancel” (light gray) and primary “Create” (dark).

ASCII spec:
```
┌─────────────────────────────────────────────┐
│ Create API Key                          ✕   │
│                                             │
│ [ API Key Name                            ] │
│                                             │
│                 [Cancel]   [Create]         │
└─────────────────────────────────────────────┘
```
Modal radius: 12px
Modal padding: 18–20px
Overlay: rgba(0,0,0,0.45)
Input height: ~36px, bg #F3F3F3
Button radius: 14–16px

ASCII spec (panel stack):
```
API Keys                                        [+ Create new API Key]

┌────────────────────────────────────────────────────────────────────────────┐
│  The key is shown only once ... (help text)                                 │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ API ID     | Name        | Create time | Key      | Status  | Action      │
├────────────────────────────────────────────────────────────────────────────┤
│ 19c1...    | Claude Code | 2026...     | sk-...   | Enabled | ✎  🗑        │
└────────────────────────────────────────────────────────────────────────────┘

Callout padding: 12-14px, radius 8px, bg #F7F7F7
Table padding: 12px vertical, 16px horizontal
```

### Login Devices
- Same pattern: info callout + table.
- Table columns: Device, First login, Last active, Action.
- Action uses trash icon.

ASCII spec (table):
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Device                 | First login        | Last active       | Action   │
├────────────────────────────────────────────────────────────────────────────┤
│ Kimi CLI (macOS ...)   | 2026/01/29 ...     | 2026/01/30 ...    | 🗑        │
└────────────────────────────────────────────────────────────────────────────┘
```

### Usage History
- Table with status in green "Success".
- Consistent row height and gridlines.

ASCII spec (status column):
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Request ID | Name       | Source           | Datetime          | Status   │
├────────────────────────────────────────────────────────────────────────────┤
│ 68f...     | Claude ... | claude-cli/...   | 2026/01/31 ...    | Success  │
└────────────────────────────────────────────────────────────────────────────┘
Status color: #45B36B (green)
```

### User Dropdown
- Right top avatar with dropdown.
- Menu items: name, dark mode toggle, language, log out.
- Menu background white, border light gray, shadow very subtle.

ASCII spec:
```
┌──────────────────────────┐
│ Morisson Marcel          │
│ Dark mode                │
│ 中文                      │
│ Log out                  │
└──────────────────────────┘
Radius: 8px, Border: #E6E6E6, Shadow: 0 4px 12px rgba(0,0,0,0.06)
```

## Iconography
- Simple line icons, 1.5px stroke, monochrome.
- Icons include: info, edit, delete, user/avatar.

## Borders and Radius
- Cards and tables: 1px light gray border.
- Border radius: ~8px for cards, tables, callouts.
- Button radius: pill (~14-16px).

## Shadows
- Very subtle or none. Dropdown has slight shadow; cards are mostly flat.

## Code Block (Docs)
- Light gray background, rounded corners.
- Monospace font inside.
- Inline code chips appear in line with text.

ASCII spec:
```
┌────────────────────────────────────────────┐
│ {                                           │
│   "agent_servers": {                        │
│     "Kimi Code CLI": { ... }                │
│   }                                         │
│ }                                           │
└────────────────────────────────────────────┘
```
Background: #F6F6F6
Radius: 8px
Padding: 12–14px

## Interaction States (inferred)
- Buttons: hover likely darkens slightly.
- Links: color darkens on hover.
- Table row hover not shown; likely subtle background.

## Suggested Tokens
- radius.sm: 6px
- radius.md: 8px
- radius.pill: 14-16px
- spacing.xs: 6px
- spacing.sm: 8-10px
- spacing.md: 12-16px
- spacing.lg: 24px
- spacing.xl: 32px
- font.size.sm: 11-12px
- font.size.md: 12-13px
- font.size.lg: 16-18px
- color.border: #E6E6E6
- color.text.primary: #222222
- color.text.secondary: #6B6B6B
- color.text.muted: #9A9A9A
- color.bg.surface: #FFFFFF
- color.bg.subtle: #F7F7F7
- color.accent.success: #45B36B
- color.button.primary: #111111
