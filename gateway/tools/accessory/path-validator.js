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
 * @returns {string|null} expanded path
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
