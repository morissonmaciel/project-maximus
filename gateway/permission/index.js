/**
 * Permission Subsystem
 *
 * Manages authorization for file/directory operations.
 */

import { dirname, resolve, sep } from 'path';

const HOME_ROOT = process.env.HOME || process.cwd();

/**
 * Extract the root directory for a given path
 * For files: returns the parent directory
 * For directories: returns the path itself
 * @param {string} filePath - Full file or directory path
 * @returns {string} Root directory for permission checking
 */
export function extractTargetDir(filePath) {
  const normalized = resolve(filePath);

  if (filePath.endsWith('/')) {
    return normalized.slice(0, -1);
  }

  return dirname(normalized);
}

/**
 * Check if path is within HOME directory
 * @param {string} filePath - Path to check
 * @returns {boolean}
 */
export function isWithinHome(filePath) {
  const normalized = resolve(filePath);
  return normalized.startsWith(HOME_ROOT);
}

/**
 * Permission Guard
 * Validates if a file operation is authorized
 */
export class PermissionGuard {
  constructor(memoryStore) {
    this.memoryStore = memoryStore;
    this.pendingRequests = new Map();
    this.pendingOperations = new Map();
  }

  /**
   * Check if a tool operation is authorized
   * @param {string} toolName - Name of the tool
   * @param {string} targetPath - Target file/directory path
   * @returns {Object} { allowed: boolean, reason: string|null, needsAuthorization: boolean }
   */
  check(toolName, targetPath) {
    if (!isWithinHome(targetPath)) {
      return {
        allowed: false,
        reason: `Path must be within HOME directory (${HOME_ROOT})`,
        needsAuthorization: false
      };
    }

    const targetDir = extractTargetDir(targetPath);

    const result = this.memoryStore.checkPermission(toolName, `${targetDir}${sep}`);

    if (result.authorized) {
      return {
        allowed: true,
        reason: null,
        needsAuthorization: false,
        viaAncestor: result.viaAncestor
      };
    }

    if (result.record && !result.authorized) {
      return {
        allowed: false,
        reason: `Authorization denied for ${toolName} on ${targetDir}.`,
        needsAuthorization: false,
        viaAncestor: result.viaAncestor
      };
    }

    return {
      allowed: false,
      reason: `Authorization required for ${toolName} on ${targetDir}. Call RequestAuthorization first.`,
      needsAuthorization: true,
      tool: toolName,
      targetDir
    };
  }

  /**
   * Store pending operation context for auto-retry
   * @param {string} requestId - Authorization request ID
   * @param {Object} operation - Operation context
   */
  storePendingOperation(requestId, operation) {
    this.pendingOperations.set(requestId, {
      ...operation,
      timestamp: Date.now()
    });

    global.__pendingAuthOperations = global.__pendingAuthOperations || new Map();
    global.__pendingAuthOperations.set(requestId, operation);
  }

  /**
   * Get pending operation by request ID
   * @param {string} requestId
   * @returns {Object|null}
   */
  getPendingOperation(requestId) {
    return this.pendingOperations.get(requestId) ||
      global.__pendingAuthOperations?.get(requestId) ||
      null;
  }

  /**
   * Clear pending operation
   * @param {string} requestId
   */
  clearPendingOperation(requestId) {
    this.pendingOperations.delete(requestId);
    global.__pendingAuthOperations?.delete(requestId);
  }

  /**
   * Check if there's a pending request for a tool/dir combo
   * @param {string} tool - Tool name
   * @param {string} targetDir - Target directory
   * @returns {boolean}
   */
  hasPendingRequest(tool, targetDir) {
    for (const req of this.pendingRequests.values()) {
      if (req.tool === tool && req.targetDir === targetDir) {
        return true;
      }
    }
    return false;
  }

  /**
   * Handle authorization response from client
   * @param {string} requestId - Request ID
   * @param {Object} response - { authorized: boolean, reason: string }
   */
  handleResponse(requestId, response) {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      console.warn(`[PermissionGuard] No pending request found for ${requestId}`);
      return null;
    }

    return pending;
  }
}

/**
 * Get all permissions for display
 * @param {Object} memoryStore - Memory store with permission methods
 * @returns {Array} List of permissions
 */
export function listAllPermissions(memoryStore) {
  return memoryStore.listPermissions();
}

/**
 * Revoke a permission
 * @param {Object} memoryStore - Memory store
 * @param {string} tool - Tool name
 * @param {string} targetDir - Target directory
 * @returns {Object} Result
 */
export function revokePermission(memoryStore, tool, targetDir) {
  return memoryStore.setPermission(tool, targetDir, {
    authorized: false,
    reason: 'Revoked by user'
  });
}
