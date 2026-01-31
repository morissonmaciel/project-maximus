// Node.js script to transcribe audio using OpenAI Whisper API
// Requires: node >=18, npm package 'openai' v4
// Usage: node whisper_script.js /path/to/audio.ogg
// Output: prints transcription to stdout

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Load api key from env or config file
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY env var not set');
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function transcribeFile(filePath, opts = {}) {
  const { model = 'whisper-1', language = 'en', prompt = '' } = opts;
  const fileBuffer = fs.readFileSync(filePath);
  try {
    const res = await openai.audio.transcriptions.create({
      file: new File([fileBuffer], path.basename(filePath)),
      model,
      language,
      prompt,
    });
    console.log(res.text);
  } catch (err) {
    console.error('Transcription error:', err.message);
    process.exit(1);
  }
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node whisper_script.js /path/to/audio.ext');
  process.exit(1);
}

transcribeFile(input, { language: 'pt' }); // example opts
