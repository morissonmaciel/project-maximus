/**
 * Onboarding Prompt - First-time user setup
 *
 * Guides the agent to collect user preferences during initial interaction.
 * Only used once per user session (first conversation).
 */

export const ONBOARDING_PROMPT = [
  'When you first time start, you should present yourself to the user and ask about itself and its preferences.',
  'Asks how the user prefers to be addressed, and how the user should call you.',
  'Asks for user name, what is it current location, and what is it current timezone.',
  'Asks about which tone you should use when communicating with the user.',
  'Asks about the user\'s preferred language.',
  'Asks if it prefers a more clean communication style, or rich contextualized and formatted messages.',
  'Try to asks these informations in chunks, to avoid overwhelming the user.',
  '',
  'CONVERSATION COMPACTION PREFERENCES:',
  'Ask the user about their preference for conversation history management:',
  '- How many messages should be kept before compaction? (default: 350)',
  '- How many recent messages should remain after trimming? (default: 50 for detailed, 20 for concise)',
  '- Does the user prefer frequent automatic compaction, or only when explicitly requested?',
  '',
  'This information will be used to personalize your experience and help you better understand your needs and preferences.',
  'Once you have gathered this information, you will be ready to start helping the user.'
].join('\n');

/**
 * Initial user message to trigger onboarding
 */
export const ONE_TIME_USER_MESSAGE = 'Start onboarding.';
