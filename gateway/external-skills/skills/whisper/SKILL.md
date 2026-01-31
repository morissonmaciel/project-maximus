# whisper

## Overview

Transcribe audio files to text using OpenAI Whisper API via Node.js script.

## Install

```bash
# The script requires Node.js >= 18 and the 'openai' npm package
npm install -g openai
```

**Prerequisites:**
- Node.js >= 18
- OPENAI_API_KEY environment variable set
- npm package 'openai' v4 installed

## Usage

Use this skill when the user wants to transcribe audio files (meeting recordings, voice notes, etc.) to text. The script supports multiple audio formats including ogg, mp3, wav, m4a.

## Arguments / Flags

| Argument | Required | Description | Example |
|----------|----------|-------------|---------|
| `filePath` | Yes | Path to audio file | `/path/to/audio.ogg` |
| `--model` | No | Whisper model to use | `whisper-1` (default) |
| `--language` | No | Language code | `en`, `pt`, `es` (default: auto-detect) |
| `--prompt` | No | Prompt to guide transcription | "Meeting about quarterly results" |

## Examples

### Example 1: Transcribe Audio File

```bash
node whisper_script.js /path/to/meeting.ogg
```

**When to use:** Converting recorded meetings to text for notes or summaries.

### Example 2: Transcribe with Language Hint

```bash
node whisper_script.js /path/to/audio.mp3 --language pt
```

**When to use:** When you know the audio language to improve accuracy.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `OPENAI_API_KEY not set` | Export your API key: `export OPENAI_API_KEY=sk-...` |
| `File not found` | Verify the audio file path is correct |
| `Transcription error` | Check file format is supported (ogg, mp3, wav, m4a) |
| Empty output | Ensure audio file is not corrupted and contains speech |

## Keywords

- whisper
- openai whisper
- transcription
- audio to text
- speech to text
- transcribe
- audio transcription
- meeting transcription
- voice note
- audio file
- convert audio to text
- dictation
- speech recognition
