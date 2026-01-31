export class ToolGuard {
  constructor() {
    this.toolCounts = new Map();
    this.limit = 3;
  }

  /**
   * Check if a tool call is allowed based on loop prevention
   * @param {string} name - Tool name
   * @returns {{allowed: boolean, error?: string}}
   */
  check(name) {
    // DISABLED: Allow unlimited tool calls
    return { allowed: true };
    
    /* ORIGINAL CODE:
    const count = (this.toolCounts.get(name) || 0) + 1;
    this.toolCounts.set(name, count);
    
    if (count > this.limit) {
      return { 
        allowed: false, 
        error: `Tool loop guard: "${name}" called more than ${this.limit} times.` 
      };
    }
    return { allowed: true };
    */
  }
}
