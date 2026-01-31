/**
 * External Skills Bootstrap
 * 
 * Handles ingestion of external skills into memory at startup.
 * Replaces the old skills/ folder ingestion with the new registry-based system.
 */

import * as registry from './registry.js';

/**
 * Bootstrap all skills into memory
 * @param {Object} memoryStore - Memory store instance
 * @param {Object} options - Options
 * @param {boolean} options.force - Force re-ingestion even if hash matches
 */
export async function bootstrapSkills(memoryStore, options = {}) {
  if (!memoryStore) {
    console.warn('[Skills] Memory store not available, skipping skill ingestion');
    return { success: false, error: 'memory_unavailable' };
  }

  const results = {
    ingested: [],
    skipped: [],
    failed: [],
    summary: false
  };

  try {
    // Validate registry first
    const validation = registry.validateRegistry();
    if (!validation.valid) {
      console.error('[Skills] Registry validation failed:', validation.errors);
      return { success: false, error: 'validation_failed', details: validation.errors };
    }

    const skills = registry.getAllSkills();
    console.log(`[Skills] Bootstrapping ${skills.length} skills...`);

    // Ingest each skill doc
    for (const skill of skills) {
      try {
        const docContent = registry.getSkillDoc(skill.id);
        if (!docContent) {
          console.warn(`[Skills] No doc content for ${skill.id}, skipping`);
          results.failed.push({ id: skill.id, error: 'no_content' });
          continue;
        }

        // Build enhanced content with metadata header
        const enhancedContent = buildSkillContent(skill, docContent);
        const hash = await hashContent(enhancedContent);
        
        const markerKey = `external-skill:ingested/${skill.id}`;
        const existingHash = memoryStore.getMeta(markerKey);
        
        if (!options.force && existingHash === hash) {
          results.skipped.push({ id: skill.id, reason: 'unchanged' });
          continue;
        }

        const docPath = `docs:external-skills/${skill.id}`;
        
        // Remove old content
        memoryStore.removeByPath(docPath);
        
        // Ingest with metadata
        await memoryStore.ingestText({
          sessionId: 'system',
          provider: 'system',
          role: 'system',
          text: enhancedContent,
          source: 'external-skills',
          path: docPath
        });

        memoryStore.setMeta(markerKey, hash);
        results.ingested.push({ id: skill.id, chunks: estimateChunks(enhancedContent) });
        console.log(`[Skills] Ingested ${skill.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Skills] Failed to ingest ${skill.id}: ${message}`);
        results.failed.push({ id: skill.id, error: message });
      }
    }

    // Ingest skills summary index
    try {
      const summaryContent = registry.buildSkillsSummary();
      const summaryHash = await hashContent(summaryContent);
      const summaryMarker = 'external-skill:summary';
      
      if (options.force || memoryStore.getMeta(summaryMarker) !== summaryHash) {
        memoryStore.removeByPath('docs:external-skills/summary');
        await memoryStore.ingestText({
          sessionId: 'system',
          provider: 'system',
          role: 'system',
          text: summaryContent,
          source: 'external-skills',
          path: 'docs:external-skills/summary'
        });
        memoryStore.setMeta(summaryMarker, summaryHash);
        results.summary = true;
        console.log('[Skills] Ingested summary index');
      }
    } catch (err) {
      console.error(`[Skills] Failed to ingest summary: ${err.message}`);
    }

    console.log(`[Skills] Bootstrap complete: ${results.ingested.length} ingested, ${results.skipped.length} skipped, ${results.failed.length} failed`);
    return { success: true, results };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Skills] Bootstrap failed: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Re-ingest a specific skill by ID
 * @param {Object} memoryStore - Memory store instance
 * @param {string} skillId - Skill ID
 */
export async function reingestSkill(memoryStore, skillId) {
  if (!memoryStore) {
    return { success: false, error: 'memory_unavailable' };
  }

  const skill = registry.getSkillById(skillId);
  if (!skill) {
    return { success: false, error: 'skill_not_found' };
  }

  try {
    const docContent = registry.getSkillDoc(skillId);
    if (!docContent) {
      return { success: false, error: 'no_content' };
    }

    const enhancedContent = buildSkillContent(skill, docContent);
    const hash = await hashContent(enhancedContent);
    
    const docPath = `docs:external-skills/${skillId}`;
    memoryStore.removeByPath(docPath);
    
    await memoryStore.ingestText({
      sessionId: 'system',
      provider: 'system',
      role: 'system',
      text: enhancedContent,
      source: 'external-skills',
      path: docPath
    });

    memoryStore.setMeta(`external-skill:ingested/${skillId}`, hash);
    
    return { success: true, id: skillId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Get list of skills for UI
 */
export function getSkillsList() {
  return registry.getSkillsList();
}

/**
 * Match user query to skills using keywords
 * @param {string} text - User input
 * @returns {Array} Matching skill IDs
 */
export function matchSkills(text) {
  return registry.matchSkillsByKeywords(text);
}

/**
 * Build enhanced skill content with metadata header
 */
function buildSkillContent(skill, docContent) {
  const header = [
    `---`,
    `Skill: ${skill.name}`,
    `ID: ${skill.id}`,
    `Description: ${skill.description}`,
    `Keywords: ${skill.keywords?.join(', ')}`,
    `Entrypoints: ${skill.entrypoints?.map(e => e.name).join(', ')}`,
    `---`,
    ``
  ].join('\n');

  return header + docContent;
}

/**
 * Simple hash function for content
 */
async function hashContent(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Estimate chunk count for logging
 */
function estimateChunks(content) {
  const avgChunkSize = 800;
  return Math.ceil(content.length / avgChunkSize);
}
