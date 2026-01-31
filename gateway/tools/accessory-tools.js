import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { runWebFetch } from './accessory/web-fetch.js';
import { runWebSearch } from './accessory/web-search.js';
import { readFileTool, grepTool, replaceFileTool, strReplaceFileTool } from './accessory/file-tools.js';
import { createDirTool, removeDirTool, copyDirTool, moveDirTool, copyFileTool, moveFileTool, removeFileTool } from './accessory/directory-tools.js';

const exec = promisify(execCallback);
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_WORKDIR = process.env.HOME || process.cwd();

export const ACCESSORY_TOOL_DEFINITIONS = [
  {
    name: 'RunCommand',
    description: 'Run a bash command in the user home directory. You must provide a reason explaining why this command is needed.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        command: { type: 'string', description: 'The bash command to execute' },
        timeout_ms: { type: 'integer', description: 'Optional timeout in milliseconds' }
      },
      required: ['reason', 'command'],
      additionalProperties: false
    }
  },
  {
    name: 'WebFetch',
    description: 'Fetch a URL and extract readable content (markdown or text). You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        url: { type: 'string', description: 'HTTP or HTTPS URL to fetch' },
        extractMode: { type: 'string', enum: ['markdown', 'text'] },
        maxChars: { type: 'number', minimum: 100 }
      },
      required: ['reason', 'url'],
      additionalProperties: false
    }
  },
  {
    name: 'WebSearch',
    description: 'Search the web (Brave). You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        query: { type: 'string', description: 'Search query string' },
        count: { type: 'number', minimum: 1, maximum: 10 },
        country: { type: 'string', description: '2-letter country code (e.g., US, DE, ALL)' },
        search_lang: { type: 'string', description: 'ISO language code for search results' }
      },
      required: ['reason', 'query'],
      additionalProperties: false
    }
  },
  {
    name: 'ReadFile',
    description: 'Read file contents from the user home directory ($HOME). You must provide a reason. File contents are automatically ingested into memory. Full expanded absolute paths only.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        path: { type: 'string', description: 'Full expanded absolute path under $HOME (~/ prefix allowed)' },
        maxBytes: { type: 'number', description: 'Maximum bytes to read (default: 10MB)' },
        encoding: { type: 'string', description: 'File encoding (default: utf-8)' }
      },
      required: ['reason', 'path'],
      additionalProperties: false
    }
  },
  {
    name: 'Grep',
    description: 'Search files using ripgrep or grep within $HOME. You must provide a reason. Results are automatically ingested into memory. Full expanded absolute paths only.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        pattern: { type: 'string', description: 'Search pattern (regex supported)' },
        path: { type: 'string', description: 'Full expanded absolute directory path to search' },
        glob: { type: 'string', description: 'File glob pattern (e.g., "*.js")' },
        maxResults: { type: 'number', description: 'Maximum results (default: 50, max: 100)' },
        caseSensitive: { type: 'boolean', description: 'Case sensitive search (default: true)' }
      },
      required: ['reason', 'pattern', 'path'],
      additionalProperties: false
    }
  },
  {
    name: 'ReplaceFile',
    description: 'Create or replace entire file content under $HOME. You must provide a reason. File is created if it does not exist. New content is automatically ingested into memory. Full expanded absolute paths only.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        path: { type: 'string', description: 'Full expanded absolute path under $HOME (~/ prefix allowed). File will be created if it does not exist' },
        content: { type: 'string', description: 'New file content' },
        encoding: { type: 'string', description: 'File encoding (default: utf-8)' },
        backup: { type: 'boolean', description: 'Create backup before writing (default: true, only applies if file exists)' }
      },
      required: ['reason', 'path', 'content'],
      additionalProperties: false
    }
  },
  {
    name: 'StrReplaceFile',
    description: 'Replace text blocks or patterns in a file under $HOME. You must provide a reason. Updated content is automatically ingested into memory. Full expanded absolute paths only.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        path: { type: 'string', description: 'Full expanded absolute path under $HOME (~/ prefix allowed)' },
        find: { type: 'string', description: 'Text or regex pattern to find' },
        replace: { type: 'string', description: 'Replacement text' },
        flags: { type: 'string', description: 'Regex flags (e.g., gi for global case-insensitive)' },
        maxReplacements: { type: 'number', description: 'Maximum replacements (default: unlimited)' },
        backup: { type: 'boolean', description: 'Create backup before writing (default: true)' }
      },
      required: ['reason', 'path', 'find', 'replace'],
      additionalProperties: false
    }
  },
  {
    name: 'CreateDir',
    description: 'Create a new directory at the specified full path. Parent directories will be created if they do not exist. You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        path: { type: 'string', description: 'Absolute full path of the directory to create' },
        recursive: { type: 'boolean', description: 'Create parent directories if needed (default: true)' }
      },
      required: ['reason', 'path'],
      additionalProperties: false
    }
  },
  {
    name: 'RemoveDir',
    description: 'Delete a directory. Supports permanent deletion or moving to system trash. You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        path: { type: 'string', description: 'Absolute full path of the directory to remove' },
        deletionKind: { type: 'string', enum: ['permanently', 'system_trash'], description: 'Deletion method (default: system_trash)' }
      },
      required: ['reason', 'path'],
      additionalProperties: false
    }
  },
  {
    name: 'CopyDir',
    description: 'Copy a directory recursively to a new location. Both paths must be absolute. You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        sourcePath: { type: 'string', description: 'Absolute full path of the source directory' },
        destPath: { type: 'string', description: 'Absolute full path of the destination directory' }
      },
      required: ['reason', 'sourcePath', 'destPath'],
      additionalProperties: false
    }
  },
  {
    name: 'MoveDir',
    description: 'Move a directory to a new location. Both paths must be absolute. You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        sourcePath: { type: 'string', description: 'Absolute full path of the source directory' },
        destPath: { type: 'string', description: 'Absolute full path of the destination directory' }
      },
      required: ['reason', 'sourcePath', 'destPath'],
      additionalProperties: false
    }
  },
  {
    name: 'CopyFile',
    description: 'Copy a file to a new location. Both paths must be absolute. You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        sourcePath: { type: 'string', description: 'Absolute full path of the source file' },
        destPath: { type: 'string', description: 'Absolute full path of the destination file' }
      },
      required: ['reason', 'sourcePath', 'destPath'],
      additionalProperties: false
    }
  },
  {
    name: 'MoveFile',
    description: 'Move a file to a new location. Both paths must be absolute. You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        sourcePath: { type: 'string', description: 'Absolute full path of the source file' },
        destPath: { type: 'string', description: 'Absolute full path of the destination file' }
      },
      required: ['reason', 'sourcePath', 'destPath'],
      additionalProperties: false
    }
  },
  {
    name: 'RemoveFile',
    description: 'Delete a file. Supports permanent deletion or moving to system trash. You must provide a reason.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
        path: { type: 'string', description: 'Absolute full path of the file to remove' },
        deletionKind: { type: 'string', enum: ['permanently', 'system_trash'], description: 'Deletion method (default: system_trash)' }
      },
      required: ['reason', 'path'],
      additionalProperties: false
    }
  }
];

export const ACCESSORY_OLLAMA_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'RunCommand',
      description: 'Run a bash command in the user home directory. You must provide a reason explaining why this command is needed.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          command: { type: 'string', description: 'The bash command to execute' },
          timeout_ms: { type: 'integer', description: 'Optional timeout in milliseconds' }
        },
        required: ['reason', 'command'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'WebFetch',
      description: 'Fetch a URL and extract readable content (markdown or text). You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          url: { type: 'string', description: 'HTTP or HTTPS URL to fetch' },
          extractMode: { type: 'string', enum: ['markdown', 'text'] },
          maxChars: { type: 'number', minimum: 100 }
        },
        required: ['reason', 'url'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'WebSearch',
      description: 'Search the web (Brave). You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          query: { type: 'string', description: 'Search query string' },
          count: { type: 'number', minimum: 1, maximum: 10 },
          country: { type: 'string', description: '2-letter country code (e.g., US, DE, ALL)' },
          search_lang: { type: 'string', description: 'ISO language code for search results' }
        },
        required: ['reason', 'query'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ReadFile',
      description: 'Read file contents from the user home directory ($HOME). You must provide a reason. File contents are automatically ingested into memory. Full expanded absolute paths only.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          path: { type: 'string', description: 'Full expanded absolute path under $HOME (~/ prefix allowed)' },
          maxBytes: { type: 'number', description: 'Maximum bytes to read (default: 10MB)' },
          encoding: { type: 'string', description: 'File encoding (default: utf-8)' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'Grep',
      description: 'Search files using ripgrep or grep within $HOME. You must provide a reason. Results are automatically ingested into memory. Full expanded absolute paths only.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          pattern: { type: 'string', description: 'Search pattern (regex supported)' },
          path: { type: 'string', description: 'Full expanded absolute directory path to search' },
          glob: { type: 'string', description: 'File glob pattern (e.g., "*.js")' },
          maxResults: { type: 'number', description: 'Maximum results (default: 50, max: 100)' },
          caseSensitive: { type: 'boolean', description: 'Case sensitive search (default: true)' }
        },
        required: ['reason', 'pattern', 'path'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ReplaceFile',
      description: 'Create or replace entire file content under $HOME. You must provide a reason. File is created if it does not exist. New content is automatically ingested into memory. Full expanded absolute paths only.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          path: { type: 'string', description: 'Full expanded absolute path under $HOME (~/ prefix allowed). File will be created if it does not exist' },
          content: { type: 'string', description: 'New file content' },
          encoding: { type: 'string', description: 'File encoding (default: utf-8)' },
          backup: { type: 'boolean', description: 'Create backup before writing (default: true, only applies if file exists)' }
        },
        required: ['reason', 'path', 'content'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'StrReplaceFile',
      description: 'Replace text blocks or patterns in a file under $HOME. You must provide a reason. Updated content is automatically ingested into memory. Full expanded absolute paths only.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          path: { type: 'string', description: 'Full expanded absolute path under $HOME (~/ prefix allowed)' },
          find: { type: 'string', description: 'Text or regex pattern to find' },
          replace: { type: 'string', description: 'Replacement text' },
          flags: { type: 'string', description: 'Regex flags (e.g., gi for global case-insensitive)' },
          maxReplacements: { type: 'number', description: 'Maximum replacements (default: unlimited)' },
          backup: { type: 'boolean', description: 'Create backup before writing (default: true)' }
        },
        required: ['reason', 'path', 'find', 'replace'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'CreateDir',
      description: 'Create a new directory at the specified full path. Parent directories will be created if they do not exist. You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          path: { type: 'string', description: 'Absolute full path of the directory to create' },
          recursive: { type: 'boolean', description: 'Create parent directories if needed (default: true)' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'RemoveDir',
      description: 'Delete a directory. Supports permanent deletion or moving to system trash. You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          path: { type: 'string', description: 'Absolute full path of the directory to remove' },
          deletionKind: { type: 'string', enum: ['permanently', 'system_trash'], description: 'Deletion method (default: system_trash)' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'CopyDir',
      description: 'Copy a directory recursively to a new location. Both paths must be absolute. You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          sourcePath: { type: 'string', description: 'Absolute full path of the source directory' },
          destPath: { type: 'string', description: 'Absolute full path of the destination directory' }
        },
        required: ['reason', 'sourcePath', 'destPath'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'MoveDir',
      description: 'Move a directory to a new location. Both paths must be absolute. You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          sourcePath: { type: 'string', description: 'Absolute full path of the source directory' },
          destPath: { type: 'string', description: 'Absolute full path of the destination directory' }
        },
        required: ['reason', 'sourcePath', 'destPath'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'CopyFile',
      description: 'Copy a file to a new location. Both paths must be absolute. You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          sourcePath: { type: 'string', description: 'Absolute full path of the source file' },
          destPath: { type: 'string', description: 'Absolute full path of the destination file' }
        },
        required: ['reason', 'sourcePath', 'destPath'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'MoveFile',
      description: 'Move a file to a new location. Both paths must be absolute. You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          sourcePath: { type: 'string', description: 'Absolute full path of the source file' },
          destPath: { type: 'string', description: 'Absolute full path of the destination file' }
        },
        required: ['reason', 'sourcePath', 'destPath'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'RemoveFile',
      description: 'Delete a file. Supports permanent deletion or moving to system trash. You must provide a reason.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this tool is being called' },
          path: { type: 'string', description: 'Absolute full path of the file to remove' },
          deletionKind: { type: 'string', enum: ['permanently', 'system_trash'], description: 'Deletion method (default: system_trash)' }
        },
        required: ['reason', 'path'],
        additionalProperties: false
      }
    }
  }
];

export async function runCommandTool(input) {
  const reason = typeof input?.reason === 'string' ? input.reason : '';
  const command = typeof input?.command === 'string' ? input.command : '';
  const timeout = Number.isFinite(input?.timeout_ms) ? input.timeout_ms : DEFAULT_TIMEOUT_MS;

  if (!reason) {
    return { stdout: '', stderr: 'Reason is required for accessory tools', exit_code: 1 };
  }
  if (!command) {
    return { stdout: '', stderr: 'Command is required', exit_code: 1 };
  }

  console.log(`[Tool:RunCommand] Reason: ${reason}`);

  try {
    const wrapped = `bash -lc ${JSON.stringify(command)}`;
    const { stdout, stderr } = await exec(wrapped, {
      cwd: DEFAULT_WORKDIR,
      timeout
    });
    return { stdout: stdout ?? '', stderr: stderr ?? '', exit_code: 0 };
  } catch (err) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? 'Command failed',
      exit_code: typeof err.code === 'number' ? err.code : 1
    };
  }
}

export async function webFetchTool(input) {
  const reason = typeof input?.reason === 'string' ? input.reason : '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }
  console.log(`[Tool:WebFetch] Reason: ${reason}`);
  return runWebFetch(input || {});
}

export async function webSearchTool(input, systemConfig) {
  const reason = typeof input?.reason === 'string' ? input.reason : '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }
  console.log(`[Tool:WebSearch] Reason: ${reason}`);
  return runWebSearch({ ...input, systemConfig });
}

// Re-export file tools
export { readFileTool, grepTool, replaceFileTool, strReplaceFileTool, createDirTool, removeDirTool, copyDirTool, moveDirTool, copyFileTool, moveFileTool, removeFileTool };
