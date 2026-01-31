/**
 * Prompt Templates - Shared formatting helpers
 * 
 * Provides consistent formatting for prompt sections, lists, and blocks.
 */

/**
 * Create a titled section
 * @param {string} title - Section title
 * @param {string} body - Section body
 * @returns {string} Formatted section
 */
export function section(title, body) {
  return [
    `${title}:`,
    body
  ].join('\n');
}

/**
 * Create a bullet list from items
 * @param {string[]} items - List items
 * @param {string} bullet - Bullet character (default: '-')
 * @returns {string} Formatted list
 */
export function bulletList(items, bullet = '-') {
  return items.map(item => `${bullet} ${item}`).join('\n');
}

/**
 * Join multiple prompt blocks with proper spacing
 * @param {string[]} blocks - Blocks to join
 * @returns {string} Joined blocks
 */
export function joinBlocks(blocks) {
  return blocks
    .filter(block => block && block.trim())
    .join('\n\n');
}

/**
 * Format a memory snippet for injection
 * @param {Object} chunk - Memory chunk
 * @param {number} index - Chunk index
 * @returns {string} Formatted memory snippet
 */
export function formatMemorySnippet(chunk, index) {
  const header = `# Memory ${index + 1} (${chunk.path}:${chunk.start_line}-${chunk.end_line})`;
  return `${header}\n${chunk.text}`;
}

/**
 * Create memory context block from chunks
 * @param {Array} chunks - Memory chunks
 * @returns {string|null} Memory context or null if empty
 */
export function createMemoryContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return null;
  }
  
  const header = 'The following memory snippets may be relevant:\n';
  const snippets = chunks.map((chunk, i) => formatMemorySnippet(chunk, i));
  return header + '\n' + snippets.join('\n\n');
}

/**
 * Create skills context block
 * @param {Array} skills - Skills to include
 * @returns {string|null} Skills context or null if empty
 */
export function createSkillsContext(skills) {
  if (!skills || skills.length === 0) {
    return null;
  }
  
  const header = 'The following external skills are available:\n';
  const items = skills.map(s => `${s.id}: ${s.description}`);
  return header + '\n' + bulletList(items);
}
