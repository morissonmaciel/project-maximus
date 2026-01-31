# Reusable UI Specification (Derived from Kimi Console)

This document abstracts the Kimi Console UI into reusable patterns so future agents can build consistent components.

## 1) Foundations

### 1.1 Layout Grid
- Content column max-width: ~960–1040px
- Horizontal page gutters: 32–40px
- Vertical rhythm: 24–32px between major sections

ASCII:
```
|<-- 32–40px -->| [Content Column ~1000px] |<-- 32–40px -->|
```

### 1.2 Typography Scale
- Title (page): 16–18px, semi-bold
- Section header: 14–16px, semi-bold
- Body text: 12–13px, regular
- Muted text: 11–12px, regular
- Button label: 11–12px, medium

### 1.3 Color Tokens
- bg.surface: #FFFFFF
- bg.subtle: #F7F7F7
- border: #E6E6E6
- text.primary: #222222
- text.secondary: #6B6B6B
- text.muted: #9A9A9A
- action.primary: #111111
- action.primary.text: #FFFFFF
- status.success: #45B36B

### 1.4 Spacing Tokens
- spacing.xs: 6px
- spacing.sm: 8–10px
- spacing.md: 12–16px
- spacing.lg: 24px
- spacing.xl: 32px

### 1.5 Radius Tokens
- radius.sm: 6px
- radius.md: 8px
- radius.pill: 14–16px

---

## 2) Reusable Components

### 2.1 Top Navigation

Structure:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Brand]                                [Nav Items]               [Avatar]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Specs:
- Height: ~48px
- Padding: 12px vertical, 20px horizontal
- Nav item gap: 16px
- Active item: darker text

### 2.1.1 Docs Layout (3-Column)
- Left: sidebar nav (section lists)
- Center: content column
- Right: “On this page” TOC

ASCII:
```
┌───────────┬──────────────────────────────┬───────────┐
│ Sidebar   │            Content           │   TOC     │
└───────────┴──────────────────────────────┴───────────┘
```

### 2.1.2 Docs Sidebar (Nested Nav)
Structure:
```
┌────────────────────────────┐
│ Section Title              │
│  Item                      │
│  Item                      │
│ ───────────────────────── │
│ Section Title              │
│   Sub Item                 │
│   Sub Item (active)        │
└────────────────────────────┘
```
Specs:
- Width: 220–240px (target 232px)
- Section label: 12–13px, medium weight
- Items: 12–13px, regular
- Active item: darker text, slightly heavier weight
- Indent for sub-items: 12–16px (target 14px)
- Divider spacing: 10–12px vertical
- Horizontal padding: 16px
- Row height: 22–26px (target 24px)

---

### 2.2 Section Header

Structure:
```
Section Title
```

Specs:
- 14–16px, semi-bold
- Margin-bottom: 12–16px

---

### 2.3 Stat Card

Structure:
```
┌──────────────────────────────┐
│ Label (muted)   (i)           │
│ Value (large)                │
│ Subtext (muted)              │
│ ███████░░░░░░░░              │
└──────────────────────────────┘
```

Specs:
- Width: ~220–240px
- Radius: 8px
- Border: 1px #E6E6E6
- Padding: 16px
- Progress bar height: 4–6px

### 2.3.1 Tooltip (Info)
Structure:
```
┌────────────────────────────────┐
│ Tooltip text                   │
└───────────────┬────────────────┘
                ▼
```
Specs:
- Background: #1C1C1C to #222222
- Text: #FFFFFF
- Radius: 10px
- Padding: 10–12px vertical, 14–16px horizontal

---

### 2.4 Info Callout

Structure:
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Informational text                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

Specs:
- Background: #F7F7F7
- Border: none or subtle #E6E6E6
- Radius: 8px
- Padding: 12–14px

### 2.4.1 Modal Dialog
Structure:
```
┌──────────────────────────────────────────┐
│ Title                               ✕    │
│ [ Input Field                      ]     │
│                    [Cancel] [Create]     │
└──────────────────────────────────────────┘
```
Specs:
- Radius: 12px
- Padding: 18–20px
- Overlay: rgba(0,0,0,0.45)

---

### 2.5 Primary Button (Pill)

Structure:
```
[ + Create new API Key ]
```

Specs:
- Height: 28–32px
- Padding: 12–16px
- Radius: 14–16px (pill)
- Background: #111111
- Text: #FFFFFF
- Font size: 11–12px

---

### 2.6 Data Table

Structure:
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Col A | Col B | Col C | ... | Action                                     │
├────────────────────────────────────────────────────────────────────────────┤
│ ...                                                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

Specs:
- Header row: 11–12px, medium weight
- Row height: 12–14px vertical padding
- Border: 1px #E6E6E6
- Radius: 8px
- Divider lines: #EDEDED

### 2.6.1 Code Block
Structure:
```
┌──────────────────────────────────────────┐
│ {                                        │
│   \"agent_servers\": { ... }             │
│ }                                        │
└──────────────────────────────────────────┘
```
Specs:
- Background: #F6F6F6
- Radius: 8px
- Padding: 12–14px
- Monospace font

---

### 2.7 Status Label

Structure:
```
Success
```

Specs:
- Color: #45B36B
- Font size: 11–12px

---

### 2.8 Dropdown Menu

Structure:
```
┌──────────────────────────┐
│ User Name                │
│ Dark mode                │
│ Language                 │
│ Log out                  │
└──────────────────────────┘
```

Specs:
- Radius: 8px
- Border: #E6E6E6
- Shadow: subtle (0 4px 12px rgba(0,0,0,0.06))
- Padding: 8–12px per item

---

## 3) Composition Rules

- Use section header + info callout + table as a repeating pattern.
- Use stat cards as a 4-up grid for key metrics.
- Maintain consistent paddings across cards, tables, and callouts.
- Tables should always include an Action column aligned right.
- Buttons should be pill-shaped and dark by default.

---

## 4) Quick Component Templates

### Card Grid Template
```
[Section Title]
┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
│ Card  │  │ Card  │  │ Card  │  │ Card  │
└───────┘  └───────┘  └───────┘  └───────┘
```

### Info + Table Template
```
[Section Title]                       [Primary Button]
┌──────────────────────────────────────────────────────────────┐
│ Info text                                                    │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ Column Headers...                                            │
├──────────────────────────────────────────────────────────────┤
│ Rows...                                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 5) Usage Checklist
- Use muted text for labels and metadata.
- Keep all corners rounded (no sharp corners).
- Maintain large whitespace between blocks.
- Avoid heavy shadows (flat, calm interface).
- Use success green only for status indicators.
