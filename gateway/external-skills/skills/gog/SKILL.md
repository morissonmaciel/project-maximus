# gog

## Overview

Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.

## Install

```bash
brew install steipete/tap/gogcli
```

**Prerequisites:**
- Homebrew installed
- Google Cloud project with OAuth credentials (for initial setup)

## Usage

Use `gog` when the user needs to interact with Google Workspace services. The tool requires OAuth setup (one-time) and supports Gmail, Calendar, Drive, Contacts, Sheets, and Docs operations.

## Arguments / Flags

Common flags across commands:

| Flag | Required | Description | Example |
|------|----------|-------------|---------|
| `--account` | No | Google account to use | `--account you@gmail.com` |
| `--max` | No | Limit results | `--max 20` |
| `--json` | No | Output as JSON | `--json` |

## Examples

### Example 1: Search Gmail

```bash
gog gmail search 'newer_than:7d' --max 10
```

**When to use:** Finding recent emails without specifying exact dates.

### Example 2: Send Email

```bash
gog gmail send --to recipient@example.com --subject "Meeting Follow-up" --body "Hi, thanks for the meeting."
```

**When to use:** Sending plain text emails quickly.

### Example 3: Create Calendar Event

```bash
gog calendar create primary --summary "Team Standup" --from "2025-01-30T10:00:00" --to "2025-01-30T10:30:00"
```

**When to use:** Scheduling meetings with specific times (ISO 8601 format).

### Example 4: Read Google Sheet

```bash
gog sheets get <sheetId> "Sheet1!A1:D10" --json
```

**When to use:** Extracting data from spreadsheets programmatically.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `auth credentials` fails | Ensure client_secret.json path is correct and file is valid |
| `account not found` | Run `gog auth list` to see available accounts |
| Rate limit errors | Add delays between requests; use `--max` to limit results |

## Keywords

- gog
- gogcli
- google
- google workspace
- gsuite
- gmail
- google mail
- email
- send email
- search email
- check email
- compose email
- reply to email
- draft email
- calendar
- google calendar
- schedule meeting
- create event
- list events
- calendar event
- drive
- google drive
- find file
- contacts
- google contacts
- sheets
- google sheets
- spreadsheet
- update sheet
- docs
- google docs
