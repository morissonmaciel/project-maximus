/**
 * External Skills Registry
 * 
 * Loads and manages external skills from gateway/external-skills/
 * Provides skill discovery, keyword matching, and memory ingestion.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, 'index.json');
const SCHEMA_PATH = path.join(__dirname, 'schema.json');

let cachedRegistry = null;
let cachedSkillsIndex = null;

function normalizeSkillId(id) {
  return String(id || '').trim().toLowerCase();
}

function isValidSkillId(id) {
  return /^[a-z0-9][a-z0-9_-]*$/.test(id);
}

/**
 * Load and validate the skills registry
 * @returns {Object} Parsed registry with skills array
 */
export function loadRegistry() {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    const registry = JSON.parse(content);
    
    // Basic validation
    if (!registry.version || !Array.isArray(registry.skills)) {
      throw new Error('Invalid registry: missing version or skills array');
    }

    // Validate each skill has required fields
    for (const skill of registry.skills) {
      if (!skill.id || !skill.name || !skill.description || !skill.docPath) {
        console.warn(`[Skills] Skill missing required fields: ${skill.id || 'unknown'}`);
      }
      if (!Array.isArray(skill.keywords) || skill.keywords.length === 0) {
        console.warn(`[Skills] Skill has no keywords: ${skill.id}`);
      }
    }

    cachedRegistry = registry;
    console.log(`[Skills] Loaded ${registry.skills.length} skills from registry`);
    return registry;
  } catch (err) {
    console.error(`[Skills] Failed to load registry: ${err.message}`);
    return { version: '0.0.0', skills: [] };
  }
}

/**
 * Get all skills
 * @returns {Array} List of skills
 */
export function getAllSkills() {
  const registry = loadRegistry();
  return registry.skills || [];
}

/**
 * Get a skill by ID
 * @param {string} id - Skill ID
 * @returns {Object|null} Skill object or null
 */
export function getSkillById(id) {
  const skills = getAllSkills();
  return skills.find(s => s.id === id) || null;
}

/**
 * Build keyword-to-skill index for fast lookup
 * @returns {Map} Map of keyword -> skill IDs
 */
export function buildKeywordIndex() {
  if (cachedSkillsIndex) {
    return cachedSkillsIndex;
  }

  const index = new Map();
  const skills = getAllSkills();

  for (const skill of skills) {
    if (!skill.keywords) continue;
    
    for (const keyword of skill.keywords) {
      const normalized = keyword.toLowerCase().trim();
      if (!index.has(normalized)) {
        index.set(normalized, []);
      }
      if (!index.get(normalized).includes(skill.id)) {
        index.get(normalized).push(skill.id);
      }
    }
  }

  cachedSkillsIndex = index;
  return index;
}

/**
 * Match user text against skill keywords
 * @param {string} text - User input text
 * @returns {Array} Matching skill IDs sorted by relevance
 */
export function matchSkillsByKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const keywordIndex = buildKeywordIndex();
  const normalizedText = text.toLowerCase();
  const scores = new Map();

  // Score each keyword match
  for (const [keyword, skillIds] of keywordIndex) {
    if (normalizedText.includes(keyword)) {
      const weight = keyword.length; // Longer matches = more specific
      for (const skillId of skillIds) {
        const current = scores.get(skillId) || 0;
        scores.set(skillId, current + weight);
      }
    }
  }

  // Sort by score descending
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([skillId]) => skillId);
}

/**
 * Get skill documentation content
 * @param {string} skillId - Skill ID
 * @returns {string|null} Documentation content or null
 */
export function getSkillDoc(skillId) {
  const skill = getSkillById(skillId);
  if (!skill || !skill.docPath) {
    return null;
  }

  try {
    const docPath = path.join(__dirname, skill.docPath);
    
    // Security: ensure path is within external-skills directory
    if (!docPath.startsWith(__dirname)) {
      console.error(`[Skills] Invalid doc path for ${skillId}: ${skill.docPath}`);
      return null;
    }

    return fs.readFileSync(docPath, 'utf-8');
  } catch (err) {
    console.error(`[Skills] Failed to read doc for ${skillId}: ${err.message}`);
    return null;
  }
}

/**
 * Build a summary text of all skills for memory ingestion
 * @returns {string} Compact skills summary
 */
export function buildSkillsSummary() {
  const skills = getAllSkills();
  
  const lines = [
    'Available External Skills:',
    ''
  ];

  for (const skill of skills) {
    lines.push(`- ${skill.name}: ${skill.description}`);
    lines.push(`  Keywords: ${skill.keywords?.slice(0, 10).join(', ')}${skill.keywords?.length > 10 ? '...' : ''}`);
    
    if (skill.entrypoints && skill.entrypoints.length > 0) {
      const ep = skill.entrypoints[0];
      lines.push(`  Usage: ${ep.command}`);
    }
    lines.push('');
  }

  lines.push('Use these skills via run_command tool when user requests match the keywords.');
  lines.push('Skill docs are at gateway/external-skills/skills/<skill-id>/SKILL.md');

  return lines.join('\n');
}

/**
 * Get list of skill IDs and their metadata
 * @returns {Array} Skill metadata for UI/listing
 */
export function getSkillsList() {
  const skills = getAllSkills();
  return skills.map(skill => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    docPath: skill.docPath,
    keywords: skill.keywords?.slice(0, 5) || []
  }));
}

/**
 * Add a new skill to the registry and write SKILL.md
 * @param {Object} skill - Skill metadata
 * @param {string} content - SKILL.md content
 * @returns {Object} Result { success, id, error? }
 */
export function addSkill(skill, content) {
  const id = normalizeSkillId(skill?.id);
  if (!id || !isValidSkillId(id)) {
    return { success: false, error: 'invalid_skill_id' };
  }

  const registry = loadRegistry();
  if (registry.skills.find((s) => s.id === id)) {
    return { success: false, error: 'skill_already_exists' };
  }

  const docPath = `skills/${id}/SKILL.md`;
  const fullDocPath = path.join(__dirname, docPath);
  const dir = path.dirname(fullDocPath);

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullDocPath, content || '', 'utf-8');
  } catch (err) {
    return { success: false, error: `write_failed: ${err.message}` };
  }

  const entry = {
    id,
    name: skill.name || id,
    description: skill.description || '',
    keywords: Array.isArray(skill.keywords) ? skill.keywords : [],
    docPath,
    entrypoints: Array.isArray(skill.entrypoints) ? skill.entrypoints : []
  };

  registry.skills.push(entry);
  try {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
    clearCache();
    return { success: true, id };
  } catch (err) {
    return { success: false, error: `registry_write_failed: ${err.message}` };
  }
}

/**
 * Clear caches (useful for testing/hot reload)
 */
export function clearCache() {
  cachedRegistry = null;
  cachedSkillsIndex = null;
}

/**
 * Remove a skill from the registry and delete its files
 * @param {string} skillId - Skill ID to remove
 * @returns {Object} Result { success, id?, error? }
 */
export function removeSkill(skillId) {
  const id = normalizeSkillId(skillId);
  if (!id || !isValidSkillId(id)) {
    return { success: false, error: 'invalid_skill_id' };
  }

  const registry = loadRegistry();
  const skillIndex = registry.skills.findIndex((s) => s.id === id);
  if (skillIndex === -1) {
    return { success: false, error: 'skill_not_found' };
  }

  const skill = registry.skills[skillIndex];

  try {
    // Remove skill directory
    const skillDir = path.join(__dirname, 'skills', id);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }

    // Remove from registry
    registry.skills.splice(skillIndex, 1);
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
    clearCache();

    return { success: true, id };
  } catch (err) {
    return { success: false, error: `remove_failed: ${err.message}` };
  }
}

/**
 * Validate registry against schema
 * Note: This is a basic validation. For production, use ajv or similar.
 * @returns {Object} Validation result
 */
export function validateRegistry() {
  const errors = [];
  const registry = loadRegistry();

  if (!registry.version) {
    errors.push('Missing version field');
  }

  if (!Array.isArray(registry.skills)) {
    errors.push('Skills must be an array');
  } else {
    for (const skill of registry.skills) {
      if (!skill.id) errors.push(`Skill missing id`);
      if (!skill.name) errors.push(`Skill ${skill.id || '?'} missing name`);
      if (!skill.description) errors.push(`Skill ${skill.id || '?'} missing description`);
      if (!skill.docPath) errors.push(`Skill ${skill.id || '?'} missing docPath`);
      if (!Array.isArray(skill.keywords) || skill.keywords.length === 0) {
        errors.push(`Skill ${skill.id || '?'} has no keywords`);
      }
      
      // Check doc file exists
      if (skill.docPath) {
        const docPath = path.join(__dirname, skill.docPath);
        if (!fs.existsSync(docPath)) {
          errors.push(`Skill ${skill.id}: doc file not found at ${skill.docPath}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
