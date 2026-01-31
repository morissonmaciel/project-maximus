# Detailed Implementation Plan: Full Path File Tools

## Overview
This plan details the implementation of mandatory full-path file operations for all accessory tools, replacing relative path support with strict absolute path validation.

## Background
- Current file tools accept relative paths which can cause confusion
- The chat model sometimes omits folder paths, causing operations in wrong directories
- Solution: Enforce full expanded paths with new helper tools for path discovery

---

## Phase 1: Core Infrastructure Changes

### 1.1 Create Path Validation Utility
**File**: `gateway/tools/accessory/path-validator.js` (NEW)

```javascript
/**
 * Path validation utilities for file/directory operations
 * Enforces full expanded paths only - no relative paths allowed
 */

import { isAbsolute, resolve } from 'path';
import { stat, access } from 'fs/promises';
import { constants } from 'fs';

const HOME_ROOT = process.env.HOME || process.cwd();

/**
 * Expand ~ to HOME directory
 * @param {string} inputPath
 * @returns {string} expanded path
 */
export function expandHome(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }
  if (inputPath === '~' || inputPath.startsWith('~/')) {
    return inputPath.replace(/^~/, HOME_ROOT);
  }
  return inputPath;
}

/**
 * Validates that a path is a full expanded path
 * Rules:
 * - Must be a string
 * - Must be absolute (starts with / on Unix, drive letter on Windows)
 * - No relative segments (..) allowed at start
 * - ~ is expanded before validation
 *
 * @param {string} inputPath
 * @param {Object} options
 * @param {boolean} options.mustExist - If true, path must exist on filesystem
 * @param {'file'|'directory'|'any'} options.pathType - Expected path type
 * @returns {Object} { valid: boolean, absolutePath: string|null, error: string|null }
 */
export async function validateFullPath(inputPath, options = {}) {
  const { mustExist = false, pathType = 'any' } = options;

  // Check if path is provided
  if (!inputPath || typeof inputPath !== 'string') {
    return {
      valid: false,
      absolutePath: null,
      error: 'Path is required and must be a string'
    };
  }

  // Expand ~ to HOME
  const expanded = expandHome(inputPath);

  // Check if it's absolute
  if (!isAbsolute(expanded)) {
    return {
      valid: false,
      absolutePath: null,
      error: `Path must be an absolute path. Received: "${inputPath}". Use GetWorkingDir or GetRootMaximusDir to get valid base paths.`
    };
  }

  // Resolve to full path (removes any relative segments like ../)
  const absolutePath = resolve(expanded);

  // Security: ensure path is within HOME directory
  if (!absolutePath.startsWith(HOME_ROOT)) {
    return {
      valid: false,
      absolutePath: null,
      error: `Path must be within HOME directory (${HOME_ROOT}). Received: "${inputPath}"`
    };
  }

  // Check existence if required
  if (mustExist) {
    try {
      const stats = await stat(absolutePath);

      if (pathType === 'file' && !stats.isFile()) {
        return {
          valid: false,
          absolutePath,
          error: `Path exists but is not a file: "${inputPath}"`
        };
      }

      if (pathType === 'directory' && !stats.isDirectory()) {
        return {
          valid: false,
          absolutePath,
          error: `Path exists but is not a directory: "${inputPath}"`
        };
      }
    } catch (err) {
      return {
        valid: false,
        absolutePath,
        error: `Path does not exist: "${inputPath}"`
      };
    }
  }

  return { valid: true, absolutePath, error: null };
}

/**
 * Check if directory is writable
 * @param {string} dirPath - Directory path (must be absolute)
 * @returns {Object} { writable: boolean, error: string|null }
 */
export async function checkDirectoryWritable(dirPath) {
  try {
    await access(dirPath, constants.W_OK);
    return { writable: true, error: null };
  } catch (err) {
    return { writable: false, error: `Directory is not writable: ${err.message}` };
  }
}
```

### 1.2 Update File Tools to Use Validation
**File**: `gateway/tools/accessory/file-tools.js`

Changes to each tool:

#### ReadFile Tool (lines 94-147)
- Replace `resolvePath()` with `validateFullPath()`
- Add early validation before file operations
- Return validation error immediately if path is not absolute

```javascript
// Import at top
import { validateFullPath } from './path-validator.js';

// In readFileTool function:
const filePath = input?.path;
if (!filePath) {
  return { error: 'Path is required' };
}

// Validate path is absolute
const validation = await validateFullPath(filePath, { mustExist: true, pathType: 'file' });
if (!validation.valid) {
  return { error: validation.error };
}
const absolutePath = validation.absolutePath;
```

#### Grep Tool (lines 155-281)
- Update to use `validateFullPath()` with `pathType: 'directory'`
- Validate search path before executing grep

#### ReplaceFile Tool (lines 289-353)
- Validate path with `pathType: 'any'` (allows creating new files)
- Parent directory must exist and be writable

#### StrReplaceFile Tool (lines 361-478)
- Validate path with `mustExist: true, pathType: 'file'`
- File must exist for string replacement

---

## Phase 2: New Core Tools

### 2.1 GetWorkingDir Tool
**File**: `gateway/tools/core-tools.js` - Add new tool definition

```javascript
{
  name: 'GetWorkingDir',
  description: 'Return the current working directory as a full expanded absolute path. Use this to construct valid file paths for other file tools.',
  input_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
}
```

**Implementation** (add to core-tools.js):

```javascript
export async function getWorkingDirTool() {
  const cwd = process.cwd();
  return {
    success: true,
    workingDir: cwd,
    expandedPath: resolve(cwd) // Fully resolved path
  };
}
```

### 2.2 GetRootMaximusDir Tool
**File**: `gateway/tools/core-tools.js` - Add new tool definition

```javascript
{
  name: 'GetRootMaximusDir',
  description: 'Return the full path where the Maximus gateway subsystem is running from. Use this to locate gateway files, configs, and other Maximus resources.',
  input_schema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
}
```

**Implementation**:

```javascript
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export async function getRootMaximusDirTool() {
  // Get the directory where this file is located
  const currentFilePath = fileURLToPath(import.meta.url);
  const toolsDir = dirname(currentFilePath);
  const gatewayDir = dirname(toolsDir);

  return {
    success: true,
    rootMaximusDir: resolve(gatewayDir),
    toolsDir: resolve(toolsDir)
  };
}
```

---

## Phase 3: New Accessory Tools

### 3.1 Create Directory Tool
**File**: `gateway/tools/accessory/directory-tools.js` (NEW)

```javascript
/**
 * Directory operation tools
 */

import { mkdir, rm, cp, rename, stat } from 'fs/promises';
import { dirname } from 'path';
import { validateFullPath, checkDirectoryWritable } from './path-validator.js';

/**
 * CreateDir tool - Create a new directory
 */
export async function createDirTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const dirPath = input?.path;
  if (!dirPath) {
    return { error: 'Path is required' };
  }

  // Validate path is absolute
  const validation = await validateFullPath(dirPath);
  if (!validation.valid) {
    return { error: validation.error };
  }
  const absolutePath = validation.absolutePath;

  const recursive = input?.recursive !== false; // default true

  console.log(`[Tool:CreateDir] Reason: ${reason}, Path: ${dirPath}`);

  try {
    await mkdir(absolutePath, { recursive });
    return {
      success: true,
      path: dirPath,
      absolutePath,
      created: true
    };
  } catch (err) {
    return { error: err.message || 'Failed to create directory' };
  }
}
```

**Tool Definition** (add to `gateway/tools/accessory-tools.js`):

```javascript
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
}
```

### 3.2 RemoveDir Tool

```javascript
export async function removeDirTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const dirPath = input?.path;
  if (!dirPath) {
    return { error: 'Path is required' };
  }

  // Validate path is absolute and exists
  const validation = await validateFullPath(dirPath, { mustExist: true, pathType: 'directory' });
  if (!validation.valid) {
    return { error: validation.error };
  }
  const absolutePath = validation.absolutePath;

  const deletionKind = input?.deletionKind || 'system_trash'; // 'permanently' or 'system_trash'

  console.log(`[Tool:RemoveDir] Reason: ${reason}, Path: ${dirPath}, Kind: ${deletionKind}`);

  try {
    if (deletionKind === 'permanently') {
      await rm(absolutePath, { recursive: true, force: true });
      return {
        success: true,
        path: dirPath,
        absolutePath,
        deletionKind: 'permanently',
        removed: true
      };
    } else {
      // System trash - use macOS trash or Linux trash-cli
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Try macOS osascript first, then trash-cli
      try {
        await execAsync(`osascript -e 'tell application "Finder" to delete POSIX file "${absolutePath}"'`);
      } catch {
        // Fallback to trash-cli or rm (safer on Linux)
        await execAsync(`trash-put "${absolutePath}"`);
      }

      return {
        success: true,
        path: dirPath,
        absolutePath,
        deletionKind: 'system_trash',
        removed: true
      };
    }
  } catch (err) {
    return { error: err.message || 'Failed to remove directory' };
  }
}
```

**Tool Definition**:

```javascript
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
}
```

### 3.3 CopyDir Tool

```javascript
export async function copyDirTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const sourcePath = input?.sourcePath;
  const destPath = input?.destPath;

  if (!sourcePath || !destPath) {
    return { error: 'Both sourcePath and destPath are required' };
  }

  // Validate both paths are absolute
  const sourceValidation = await validateFullPath(sourcePath, { mustExist: true, pathType: 'directory' });
  if (!sourceValidation.valid) {
    return { error: `Source: ${sourceValidation.error}` };
  }

  const destValidation = await validateFullPath(destPath);
  if (!destValidation.valid) {
    return { error: `Destination: ${destValidation.error}` };
  }

  console.log(`[Tool:CopyDir] Reason: ${reason}, Source: ${sourcePath}, Dest: ${destPath}`);

  try {
    await cp(sourceValidation.absolutePath, destValidation.absolutePath, { recursive: true });
    return {
      success: true,
      sourcePath,
      destPath,
      sourceAbsolute: sourceValidation.absolutePath,
      destAbsolute: destValidation.absolutePath
    };
  } catch (err) {
    return { error: err.message || 'Failed to copy directory' };
  }
}
```

**Tool Definition**:

```javascript
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
}
```

### 3.4 MoveDir Tool

```javascript
export async function moveDirTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const sourcePath = input?.sourcePath;
  const destPath = input?.destPath;

  if (!sourcePath || !destPath) {
    return { error: 'Both sourcePath and destPath are required' };
  }

  // Validate both paths
  const sourceValidation = await validateFullPath(sourcePath, { mustExist: true, pathType: 'directory' });
  if (!sourceValidation.valid) {
    return { error: `Source: ${sourceValidation.error}` };
  }

  const destValidation = await validateFullPath(destPath);
  if (!destValidation.valid) {
    return { error: `Destination: ${destValidation.error}` };
  }

  console.log(`[Tool:MoveDir] Reason: ${reason}, Source: ${sourcePath}, Dest: ${destPath}`);

  try {
    await rename(sourceValidation.absolutePath, destValidation.absolutePath);
    return {
      success: true,
      sourcePath,
      destPath,
      sourceAbsolute: sourceValidation.absolutePath,
      destAbsolute: destValidation.absolutePath
    };
  } catch (err) {
    return { error: err.message || 'Failed to move directory' };
  }
}
```

**Tool Definition**:

```javascript
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
}
```

### 3.5 CopyFile Tool

```javascript
import { cp as copyFile } from 'fs/promises';

export async function copyFileTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const sourcePath = input?.sourcePath;
  const destPath = input?.destPath;

  if (!sourcePath || !destPath) {
    return { error: 'Both sourcePath and destPath are required' };
  }

  // Validate both paths
  const sourceValidation = await validateFullPath(sourcePath, { mustExist: true, pathType: 'file' });
  if (!sourceValidation.valid) {
    return { error: `Source: ${sourceValidation.error}` };
  }

  const destValidation = await validateFullPath(destPath);
  if (!destValidation.valid) {
    return { error: `Destination: ${destValidation.error}` };
  }

  console.log(`[Tool:CopyFile] Reason: ${reason}, Source: ${sourcePath}, Dest: ${destPath}`);

  try {
    await copyFile(sourceValidation.absolutePath, destValidation.absolutePath);
    return {
      success: true,
      sourcePath,
      destPath,
      sourceAbsolute: sourceValidation.absolutePath,
      destAbsolute: destValidation.absolutePath
    };
  } catch (err) {
    return { error: err.message || 'Failed to copy file' };
  }
}
```

**Tool Definition**:

```javascript
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
}
```

### 3.6 MoveFile Tool

```javascript
import { rename } from 'fs/promises';

export async function moveFileTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const sourcePath = input?.sourcePath;
  const destPath = input?.destPath;

  if (!sourcePath || !destPath) {
    return { error: 'Both sourcePath and destPath are required' };
  }

  // Validate both paths
  const sourceValidation = await validateFullPath(sourcePath, { mustExist: true, pathType: 'file' });
  if (!sourceValidation.valid) {
    return { error: `Source: ${sourceValidation.error}` };
  }

  const destValidation = await validateFullPath(destPath);
  if (!destValidation.valid) {
    return { error: `Destination: ${destValidation.error}` };
  }

  console.log(`[Tool:MoveFile] Reason: ${reason}, Source: ${sourcePath}, Dest: ${destPath}`);

  try {
    await rename(sourceValidation.absolutePath, destValidation.absolutePath);
    return {
      success: true,
      sourcePath,
      destPath,
      sourceAbsolute: sourceValidation.absolutePath,
      destAbsolute: destValidation.absolutePath
    };
  } catch (err) {
    return { error: err.message || 'Failed to move file' };
  }
}
```

**Tool Definition**:

```javascript
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
}
```

### 3.7 RemoveFile Tool

```javascript
import { rm } from 'fs/promises';

export async function removeFileTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const filePath = input?.path;
  if (!filePath) {
    return { error: 'Path is required' };
  }

  // Validate path is absolute and exists
  const validation = await validateFullPath(filePath, { mustExist: true, pathType: 'file' });
  if (!validation.valid) {
    return { error: validation.error };
  }
  const absolutePath = validation.absolutePath;

  const deletionKind = input?.deletionKind || 'system_trash'; // 'permanently' or 'system_trash'

  console.log(`[Tool:RemoveFile] Reason: ${reason}, Path: ${filePath}, Kind: ${deletionKind}`);

  try {
    if (deletionKind === 'permanently') {
      await rm(absolutePath);
      return {
        success: true,
        path: filePath,
        absolutePath,
        deletionKind: 'permanently',
        removed: true
      };
    } else {
      // System trash
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        await execAsync(`osascript -e 'tell application "Finder" to delete POSIX file "${absolutePath}"'`);
      } catch {
        await execAsync(`trash-put "${absolutePath}"`);
      }

      return {
        success: true,
        path: filePath,
        absolutePath,
        deletionKind: 'system_trash',
        removed: true
      };
    }
  } catch (err) {
    return { error: err.message || 'Failed to remove file' };
  }
}
```

**Tool Definition**:

```javascript
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
```

---

## Phase 4: Tool Registration

### 4.1 Update Tool Exports
**File**: `gateway/tools/accessory-tools.js`

Add imports for new tools:

```javascript
import {
  createDirTool,
  removeDirTool,
  copyDirTool,
  moveDirTool,
  copyFileTool,
  moveFileTool,
  removeFileTool
} from './accessory/directory-tools.js';
```

Add tool definitions to ACCESSORY_TOOL_DEFINITIONS array:

```javascript
export const ACCESSORY_TOOL_DEFINITIONS = [
  // ... existing tools ...
  {
    name: 'CreateDir',
    // ... definition
  },
  {
    name: 'RemoveDir',
    // ... definition
  },
  {
    name: 'CopyDir',
    // ... definition
  },
  {
    name: 'MoveDir',
    // ... definition
  },
  {
    name: 'CopyFile',
    // ... definition
  },
  {
    name: 'MoveFile',
    // ... definition
  },
  {
    name: 'RemoveFile',
    // ... definition
  }
];
```

Add Ollama definitions (ACCESSORY_OLLAMA_TOOL_DEFINITIONS) similarly.

### 4.2 Update Tool Executer
**File**: `gateway/tools/tools-executer.js`

Add imports:

```javascript
import {
  // ... existing imports ...
  createDirTool,
  removeDirTool,
  copyDirTool,
  moveDirTool,
  copyFileTool,
  moveFileTool,
  removeFileTool
} from './accessory-tools.js';
```

Add core tool imports:

```javascript
import {
  // ... existing imports ...
  getWorkingDirTool,
  getRootMaximusDirTool
} from './core-tools.js';
```

Add switch cases in `runToolCall`:

```javascript
switch (toolName) {
  // ... existing cases ...

  // NEW CORE TOOLS
  case 'GetWorkingDir':
    return getWorkingDirTool();

  case 'GetRootMaximusDir':
    return getRootMaximusDirTool();

  // NEW ACCESSORY TOOLS
  case 'CreateDir':
    return createDirTool(toolCall.input || {});

  case 'RemoveDir':
    return removeDirTool(toolCall.input || {});

  case 'CopyDir':
    return copyDirTool(toolCall.input || {});

  case 'MoveDir':
    return moveDirTool(toolCall.input || {});

  case 'CopyFile':
    return copyFileTool(toolCall.input || {});

  case 'MoveFile':
    return moveFileTool(toolCall.input || {});

  case 'RemoveFile':
    return removeFileTool(toolCall.input || {});
}
```

---

## Phase 5: Self-Awareness Updates

### 5.1 Update Load Awareness
**File**: `gateway/self-awareness/load-awareness.js`

Add new awareness items for file path requirements:

```javascript
{
  title: 'File Path Requirements',
  text:
    'ALL file and directory tools now require FULL EXPANDED ABSOLUTE PATHS. Relative paths are NOT accepted. ' +
    'Use GetWorkingDir to get the current working directory, or GetRootMaximusDir to get the gateway root path. ' +
    'Construct paths like: `${GetWorkingDir.workingDir}/subdir/file.txt`. ' +
    'Tools will return an error if you provide a relative path. ' +
    'Available file/directory tools: ReadFile, Grep, ReplaceFile, StrReplaceFile, CreateDir, RemoveDir, CopyDir, MoveDir, CopyFile, MoveFile, RemoveFile. ' +
    'All tools accept deletionKind parameter for RemoveDir/RemoveFile: "permanently" or "system_trash" (default).'
},
{
  title: 'Path Discovery Tools',
  text:
    'GetWorkingDir: Returns { success, workingDir, expandedPath } - the current working directory. ' +
    'GetRootMaximusDir: Returns { success, rootMaximusDir, toolsDir } - where the gateway is running from. ' +
    'Always use these tools first when you need to construct file paths. Do not guess paths.'
}
```

Update the existing "Tools available" item to mention:
- New tools (CreateDir, RemoveDir, CopyDir, MoveDir, CopyFile, MoveFile, RemoveFile)
- Full path requirement for all file tools
- Reference to GetWorkingDir and GetRootMaximusDir

---

## Phase 6: Documentation Updates

### 6.1 Update Gateway README
**File**: `gateway/README.md`

Add new section "File and Directory Tools":

```markdown
## File and Directory Tools

All file operations require **full expanded absolute paths**. Relative paths are rejected.

### Path Discovery
Before performing file operations, use these tools to get valid base paths:

| Tool | Purpose |
|------|---------|
| `GetWorkingDir` | Returns the current working directory |
| `GetRootMaximusDir` | Returns the gateway installation directory |

### File Operations

| Tool | Purpose |
|------|---------|
| `ReadFile` | Read file contents |
| `ReplaceFile` | Create or replace entire file |
| `StrReplaceFile` | Replace text/patterns in file |
| `Grep` | Search file contents |
| `CopyFile` | Copy a file |
| `MoveFile` | Move/rename a file |
| `RemoveFile` | Delete a file (permanent or trash) |

### Directory Operations

| Tool | Purpose |
|------|---------|
| `CreateDir` | Create a directory |
| `CopyDir` | Copy directory recursively |
| `MoveDir` | Move/rename a directory |
| `RemoveDir` | Delete a directory (permanent or trash) |

### Deletion Methods

Both `RemoveFile` and `RemoveDir` support a `deletionKind` parameter:
- `"system_trash"` (default) - Moves to system trash/recycle bin
- `"permanently"` - Permanently deletes
```

Update the "Adding a Tool" section to reflect new structure.

---

## Phase 7: Testing Plan

### 7.1 Unit Tests for Path Validation

Test cases for `validateFullPath`:
- ✓ Valid absolute path
- ✗ Relative path (should reject)
- ✗ Empty path (should reject)
- ✗ Path outside HOME (should reject)
- ✓ ~ expansion
- ✓ Path with relative segments resolved correctly
- ✓ mustExist: true with existing path
- ✓ mustExist: true with non-existing path (should reject)
- ✓ pathType: 'file' with file
- ✓ pathType: 'file' with directory (should reject)

### 7.2 Integration Tests

Test each new tool:
- CreateDir: Create new directory, create nested directories
- RemoveDir: Remove to trash, remove permanently
- CopyDir: Copy existing directory, copy to new location
- MoveDir: Move existing directory
- CopyFile: Copy existing file
- MoveFile: Move existing file
- RemoveFile: Delete to trash, delete permanently
- GetWorkingDir: Returns valid path
- GetRootMaximusDir: Returns valid path

Test updated tools with relative paths (should all fail):
- ReadFile with relative path
- Grep with relative path
- ReplaceFile with relative path
- StrReplaceFile with relative path

### 7.3 End-to-End Verification

1. Start gateway and web UI
2. Send message: "Get the current working directory"
   - Should return GetWorkingDir result
3. Send message: "Create a directory at /Users/<name>/test-dir"
   - Should create directory successfully
4. Send message: "Copy /Users/<name>/test-dir to /Users/<name>/test-dir-copy"
   - Should copy successfully
5. Send message: "Remove /Users/<name>/test-dir permanently"
   - Should delete directory
6. Send message: "Read file at relative/path"
   - Should return error about relative paths

---

## File Summary

### New Files
1. `gateway/tools/accessory/path-validator.js` - Path validation utilities
2. `gateway/tools/accessory/directory-tools.js` - Directory operation tools

### Modified Files
1. `gateway/tools/accessory/file-tools.js` - Update to use validateFullPath
2. `gateway/tools/accessory-tools.js` - Add new tool definitions and exports
3. `gateway/tools/core-tools.js` - Add GetWorkingDir and GetRootMaximusDir
4. `gateway/tools/tools-executer.js` - Register new tools in switch statement
5. `gateway/self-awareness/load-awareness.js` - Add awareness of path requirements
6. `gateway/README.md` - Document new tools and path requirements

---

## Implementation Order

1. Create `path-validator.js` with validation logic
2. Update `file-tools.js` to use new validation
3. Create `directory-tools.js` with new tools
4. Add core tools (GetWorkingDir, GetRootMaximusDir) to `core-tools.js`
5. Update `accessory-tools.js` with definitions and exports
6. Update `tools-executer.js` with switch cases
7. Update `load-awareness.js` with path requirement documentation
8. Update `gateway/README.md` with tool documentation
9. Run tests and verify

---

## Critical Implementation Notes

1. **Path validation must happen BEFORE any filesystem operations**
2. **Error messages must clearly explain the full path requirement**
3. **All existing file tools must be updated to use validateFullPath**
4. **The Tools Executor is the central validation point**
5. **Self-awareness must inform the AI about path requirements**
6. **Ollama tool definitions must also be updated** (ACCESSORY_OLLAMA_TOOL_DEFINITIONS)
