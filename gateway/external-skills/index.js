/**
 * External Skills Subsystem
 * 
 * Public API for managing and using external skills.
 */

// Registry operations
export {
  loadRegistry,
  getAllSkills,
  getSkillById,
  getSkillsList,
  buildKeywordIndex,
  matchSkillsByKeywords,
  getSkillDoc,
  addSkill,
  removeSkill,
  buildSkillsSummary,
  validateRegistry,
  clearCache
} from './registry.js';

// Bootstrap operations
export {
  bootstrapSkills,
  reingestSkill,
  matchSkills
} from './bootstrap.js';
