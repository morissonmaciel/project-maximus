/**
 * Tool Name Utilities
 * 
 * Centralizes conversion between snake_case and PascalCase tool names.
 * Ensures consistent naming across gateway, providers, and UI.
 */

// Canonical mapping: snake_case -> PascalCase
export const TOOL_NAME_MAP = {
  'run_command': 'RunCommand',
  'web_fetch': 'WebFetch',
  'web_search': 'WebSearch',
  'list_configuration': 'ListConfiguration'
};

// Reverse mapping: PascalCase -> snake_case
export const TOOL_NAME_MAP_REVERSE = Object.fromEntries(
  Object.entries(TOOL_NAME_MAP).map(([snake, pascal]) => [pascal, snake])
);

/**
 * Convert snake_case tool name to PascalCase
 * @param {string} toolName
 * @returns {string}
 */
export function toPascal(toolName) {
  if (!toolName || typeof toolName !== 'string') return toolName;
  // If already PascalCase (contains uppercase, no underscores), return as-is
  if (/^[A-Z][a-zA-Z0-9]*$/.test(toolName) && !toolName.includes('_')) {
    return toolName;
  }
  // Look up in map or convert manually
  return TOOL_NAME_MAP[toolName] || manualToPascal(toolName);
}

/**
 * Convert PascalCase tool name to snake_case
 * @param {string} toolName
 * @returns {string}
 */
export function toSnake(toolName) {
  if (!toolName || typeof toolName !== 'string') return toolName;
  // If already snake_case (lowercase with underscores), return as-is
  if (/^[a-z_][a-z0-9_]*$/.test(toolName)) {
    return toolName;
  }
  // Look up in map or convert manually
  return TOOL_NAME_MAP_REVERSE[toolName] || manualToSnake(toolName);
}

/**
 * Manual conversion: snake_case to PascalCase
 * @param {string} str
 * @returns {string}
 */
function manualToPascal(str) {
  return str
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Manual conversion: PascalCase to snake_case
 * @param {string} str
 * @returns {string}
 */
function manualToSnake(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Normalize tool name to PascalCase (with fallback)
 * Use this at all entry points where tool names arrive from providers
 * @param {string} toolName
 * @returns {string}
 */
export function normalizeToolName(toolName) {
  return toPascal(toolName);
}

/**
 * Get display label for tool status
 * @param {'running'|'success'|'error'} status
 * @returns {string}
 */
export function getToolStatusLabel(status) {
  switch (status) {
    case 'running':
      return 'Using';
    case 'success':
      return 'Used';
    case 'error':
      return 'Failed';
    default:
      return 'Using';
  }
}
