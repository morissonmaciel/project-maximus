/**
 * File Operation Tools
 * 
 * Accessory tools for file operations:
 * - ReadFile: Read file contents
 * - Grep: Search files using ripgrep or grep
 * - ReplaceFile: Replace entire file content
 * - StrReplaceFile: Block/line replacement
 */

import { readFile, writeFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { dirname } from 'path';
import { validateFullPath, checkDirectoryWritable } from './path-validator.js';

const exec = promisify(execCallback);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default max

/**
 * Ingest file content into memory (best effort)
 * @param {Object} memoryStore
 * @param {string} sessionId
 * @param {string} provider
 * @param {string} absolutePath
 * @param {string} content
 */
async function ingestFileContent(memoryStore, sessionId, provider, absolutePath, content) {
  if (!memoryStore || typeof memoryStore.ingestText !== 'function') {
    return;
  }
  try {
    await memoryStore.ingestText({
      sessionId,
      provider,
      role: 'tool',
      text: content,
      source: 'file',
      path: `file:${absolutePath}`
    });
  } catch (err) {
    // Soft-fail: log but don't break tool execution
    console.warn(`[FileTools] Memory ingestion failed: ${err.message}`);
  }
}

/**
 * ReadFile tool implementation
 * @param {Object} input
 * @param {Object} context - { memoryStore, sessionId, provider }
 * @returns {Object}
 */
export async function readFileTool(input, context = {}) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const filePath = input?.path;
  if (!filePath) {
    return { error: 'Path is required' };
  }

  const maxBytes = Math.min(
    Number.isFinite(input?.maxBytes) ? input.maxBytes : MAX_FILE_SIZE,
    MAX_FILE_SIZE
  );
  const encoding = input?.encoding || 'utf-8';

  console.log(`[Tool:ReadFile] Reason: ${reason}, Path: ${filePath}`);

  try {
    const validation = await validateFullPath(filePath, { mustExist: true, pathType: 'file' });
    if (!validation.valid) {
      return { error: validation.error };
    }
    const absolutePath = validation.absolutePath;
    
    // Check file exists and get stats
    const stats = await stat(absolutePath);

    const truncated = stats.size > maxBytes;
    const content = await readFile(absolutePath, { encoding, length: maxBytes });

    // Ingest into memory (soft-fail)
    if (context.memoryStore && context.sessionId) {
      await ingestFileContent(
        context.memoryStore,
        context.sessionId,
        context.provider || 'unknown',
        absolutePath,
        content
      );
    }

    return {
      path: filePath,
      absolutePath,
      content,
      truncated,
      size: stats.size,
      encoding
    };
  } catch (err) {
    return { error: err.message || 'Failed to read file' };
  }
}

/**
 * Grep tool implementation
 * @param {Object} input
 * @param {Object} context - { memoryStore, sessionId, provider }
 * @returns {Object}
 */
export async function grepTool(input, context = {}) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const pattern = input?.pattern;
  if (!pattern) {
    return { error: 'Pattern is required' };
  }

  const searchPath = input?.path;
  if (!searchPath) {
    return { error: 'Path is required' };
  }
  const glob = input?.glob;
  const maxResults = Math.min(Number.isFinite(input?.maxResults) ? input.maxResults : 50, 100);
  const caseSensitive = input?.caseSensitive !== false; // default true

  console.log(`[Tool:Grep] Reason: ${reason}, Pattern: ${pattern}, Path: ${searchPath}`);

  try {
    const validation = await validateFullPath(searchPath, { mustExist: true, pathType: 'directory' });
    if (!validation.valid) {
      return { error: validation.error };
    }
    const absolutePath = validation.absolutePath;
    
    // Build ripgrep command
    let cmd = 'rg';
    let useRipgrep = true;
    
    // Check if ripgrep is available
    try {
      await exec('which rg');
    } catch {
      useRipgrep = false;
      cmd = 'grep';
    }

    let command;
    if (useRipgrep) {
      const args = [
        '--json',
        '--max-count', String(maxResults),
        caseSensitive ? '' : '--ignore-case',
        glob ? `--glob "${glob}"` : '',
        '--', 
        JSON.stringify(pattern),
        JSON.stringify(absolutePath)
      ].filter(Boolean).join(' ');
      command = `${cmd} ${args}`;
    } else {
      // Fallback to grep
      const args = [
        '-r',
        caseSensitive ? '' : '-i',
        '-n',
        '-H',
        '--max-count', String(maxResults),
        JSON.stringify(pattern),
        JSON.stringify(absolutePath)
      ].filter(Boolean).join(' ');
      command = `${cmd} ${args}`;
    }

    const { stdout, stderr } = await exec(command, { timeout: 30000 });
    
    if (stderr && !stdout) {
      return { error: stderr };
    }

    // Parse results
    const results = [];
    if (useRipgrep) {
      // Parse ripgrep JSON output
      for (const line of stdout.split('\n').filter(l => l.trim())) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'match') {
            const m = parsed.data;
            results.push({
              file: m.path?.text,
              line: m.line_number,
              column: m.submatches?.[0]?.start || 0,
              preview: m.lines?.text?.slice(0, 200) || ''
            });
          }
        } catch {
          // Skip malformed lines
        }
      }
    } else {
      // Parse grep output: file:line:content
      for (const line of stdout.split('\n').filter(l => l.trim())) {
        const match = line.match(/^(.+):(\d+):(.*)$/);
        if (match) {
          results.push({
            file: match[1],
            line: parseInt(match[2], 10),
            column: 0,
            preview: match[3].slice(0, 200)
          });
        }
      }
    }

    // Create summary for memory ingestion
    const summary = `Grep results for "${pattern}":\n` +
      results.map(r => `${r.file}:${r.line}: ${r.preview}`).join('\n');

    // Ingest into memory (soft-fail)
    if (context.memoryStore && context.sessionId) {
      await ingestFileContent(
        context.memoryStore,
        context.sessionId,
        context.provider || 'unknown',
        absolutePath,
        summary
      );
    }

    return {
      pattern,
      path: searchPath,
      absolutePath,
      results,
      count: results.length,
      truncated: results.length >= maxResults
    };
  } catch (err) {
    return { error: err.message || 'Grep failed' };
  }
}

/**
 * ReplaceFile tool implementation
 * @param {Object} input
 * @param {Object} context - { memoryStore, sessionId, provider }
 * @returns {Object}
 */
export async function replaceFileTool(input, context = {}) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const filePath = input?.path;
  const newContent = input?.content;
  
  if (!filePath) {
    return { error: 'Path is required' };
  }
  if (typeof newContent !== 'string') {
    return { error: 'Content must be a string' };
  }

  const encoding = input?.encoding || 'utf-8';
  const backup = input?.backup !== false; // default true

  console.log(`[Tool:ReplaceFile] Reason: ${reason}, Path: ${filePath}`);

  try {
    const validation = await validateFullPath(filePath, { mustExist: false, pathType: 'any' });
    if (!validation.valid) {
      return { error: validation.error };
    }
    const absolutePath = validation.absolutePath;
    
    // Create backup if file exists and backup enabled
    if (backup && existsSync(absolutePath)) {
      const backupPath = `${absolutePath}.backup-${Date.now()}`;
      const existingContent = await readFile(absolutePath, { encoding });
      await writeFile(backupPath, existingContent, { encoding });
    }

    // Ensure directory exists
    const dir = dirname(absolutePath);
    const dirValidation = await validateFullPath(dir, { mustExist: true, pathType: 'directory' });
    if (!dirValidation.valid) {
      return { error: dirValidation.error };
    }
    const writableCheck = await checkDirectoryWritable(dirValidation.absolutePath);
    if (!writableCheck.writable) {
      return { error: writableCheck.error };
    }

    // Write new content
    const bytesWritten = Buffer.byteLength(newContent, encoding);
    await writeFile(absolutePath, newContent, { encoding });

    // Ingest new content into memory (soft-fail)
    if (context.memoryStore && context.sessionId) {
      await ingestFileContent(
        context.memoryStore,
        context.sessionId,
        context.provider || 'unknown',
        absolutePath,
        newContent
      );
    }

    return {
      path: filePath,
      absolutePath,
      bytesWritten,
      encoding,
      backedUp: backup
    };
  } catch (err) {
    return { error: err.message || 'Failed to write file' };
  }
}

/**
 * StrReplaceFile tool implementation
 * @param {Object} input
 * @param {Object} context - { memoryStore, sessionId, provider }
 * @returns {Object}
 */
export async function strReplaceFileTool(input, context = {}) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const filePath = input?.path;
  const find = input?.find;
  const replace = input?.replace;

  if (!filePath) {
    return { error: 'Path is required' };
  }
  if (typeof find !== 'string') {
    return { error: 'Find must be a string' };
  }
  if (typeof replace !== 'string') {
    return { error: 'Replace must be a string' };
  }

  const flags = input?.flags || '';
  const maxReplacements = Number.isFinite(input?.maxReplacements) ? input.maxReplacements : Infinity;
  const backup = input?.backup !== false; // default true

  console.log(`[Tool:StrReplaceFile] Reason: ${reason}, Path: ${filePath}`);

  try {
    const validation = await validateFullPath(filePath, { mustExist: true, pathType: 'file' });
    if (!validation.valid) {
      return { error: validation.error };
    }
    const absolutePath = validation.absolutePath;
    
    // Read existing content
    const encoding = 'utf-8';
    let content;
    try {
      content = await readFile(absolutePath, { encoding });
    } catch (err) {
      return { error: `Failed to read file: ${err.message}` };
    }

    // Create backup if enabled
    if (backup) {
      const backupPath = `${absolutePath}.backup-${Date.now()}`;
      await writeFile(backupPath, content, { encoding });
    }

    // Perform replacement
    let regex;
    let replacementCount = 0;
    
    try {
      // Try to use as regex if flags provided or if find looks like regex
      if (flags || /^\/.*\/[gimuy]*$/.test(find)) {
        // Extract pattern from /pattern/flags format if used
        let pattern = find;
        let regexFlags = flags;
        if (find.startsWith('/') && find.includes('/', 1)) {
          const lastSlash = find.lastIndexOf('/');
          pattern = find.slice(1, lastSlash);
          regexFlags = find.slice(lastSlash + 1) + flags;
        }
        regex = new RegExp(pattern, regexFlags || 'g');
      } else {
        // Literal string replacement
        regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      }

      let match;
      const matches = [];
      while ((match = regex.exec(content)) !== null && matches.length < maxReplacements) {
        matches.push(match);
      }

      replacementCount = matches.length;
      
      // Perform the replacement
      if (maxReplacements !== Infinity) {
        // Limit replacements
        let replaced = 0;
        let lastIndex = 0;
        let result = '';
        for (const m of matches) {
          result += content.slice(lastIndex, m.index);
          result += replace;
          lastIndex = m.index + m[0].length;
          replaced++;
        }
        result += content.slice(lastIndex);
        content = result;
      } else {
        content = content.replace(regex, replace);
      }
    } catch (err) {
      return { error: `Invalid pattern: ${err.message}` };
    }

    // Write updated content
    await writeFile(absolutePath, content, { encoding });

    // Ingest new content into memory (soft-fail)
    if (context.memoryStore && context.sessionId) {
      await ingestFileContent(
        context.memoryStore,
        context.sessionId,
        context.provider || 'unknown',
        absolutePath,
        content
      );
    }

    return {
      path: filePath,
      absolutePath,
      replacements: replacementCount,
      backedUp: backup
    };
  } catch (err) {
    return { error: err.message || 'Failed to replace in file' };
  }
}
