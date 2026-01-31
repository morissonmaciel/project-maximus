/**
 * Directory and file operation tools
 */

import { mkdir, rm, cp, rename } from 'fs/promises';
import { validateFullPath } from './path-validator.js';

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

/**
 * RemoveDir tool - Remove a directory
 */
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

  const deletionKind = input?.deletionKind || 'system_trash';

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
    }

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
      path: dirPath,
      absolutePath,
      deletionKind: 'system_trash',
      removed: true
    };
  } catch (err) {
    return { error: err.message || 'Failed to remove directory' };
  }
}

/**
 * CopyDir tool - Copy a directory recursively
 */
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

/**
 * MoveDir tool - Move a directory
 */
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

/**
 * CopyFile tool - Copy a file
 */
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
    await cp(sourceValidation.absolutePath, destValidation.absolutePath);
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

/**
 * MoveFile tool - Move a file
 */
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

/**
 * RemoveFile tool - Remove a file
 */
export async function removeFileTool(input) {
  const reason = input?.reason || '';
  if (!reason) {
    return { error: 'Reason is required for accessory tools' };
  }

  const filePath = input?.path;
  if (!filePath) {
    return { error: 'Path is required' };
  }

  const validation = await validateFullPath(filePath, { mustExist: true, pathType: 'file' });
  if (!validation.valid) {
    return { error: validation.error };
  }
  const absolutePath = validation.absolutePath;

  const deletionKind = input?.deletionKind || 'system_trash';

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
    }

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
  } catch (err) {
    return { error: err.message || 'Failed to remove file' };
  }
}
