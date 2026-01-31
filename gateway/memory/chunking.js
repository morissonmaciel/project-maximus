import crypto from 'node:crypto';

export function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function serializeEmbedding(vector) {
  const array = Float32Array.from(vector);
  return Buffer.from(array.buffer);
}

export function deserializeEmbedding(buffer) {
  if (!buffer) return null;
  const view = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  return Array.from(view);
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function chunkTextByLines(text, maxChars = 1200, overlap = 200) {
  if (!text) return [];
  const lines = text.split('\n');
  const chunks = [];
  let buffer = [];
  let bufferLen = 0;
  let startLine = 1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    buffer.push(line);
    bufferLen += line.length + 1;

    if (bufferLen >= maxChars) {
      const endLine = i + 1;
      chunks.push({
        text: buffer.join('\n'),
        start_line: startLine,
        end_line: endLine
      });

      if (overlap > 0) {
        let overlapLen = 0;
        const newBuffer = [];
        for (let j = buffer.length - 1; j >= 0; j -= 1) {
          const candidate = buffer[j];
          overlapLen += candidate.length + 1;
          newBuffer.unshift(candidate);
          if (overlapLen >= overlap) break;
        }
        buffer = newBuffer;
        bufferLen = overlapLen;
        startLine = endLine - buffer.length + 1;
      } else {
        buffer = [];
        bufferLen = 0;
        startLine = endLine + 1;
      }
    }
  }

  if (buffer.length) {
    chunks.push({
      text: buffer.join('\n'),
      start_line: startLine,
      end_line: lines.length
    });
  }

  return chunks;
}
