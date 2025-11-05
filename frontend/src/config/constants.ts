/**
 * Application configuration constants
 */

// Simple feature flags - can be extended with environment variables later
export const IS_MANUAL_MODE = true; // Set to false for LLM mode

// Features enabled based on mode
export const FEATURES = {
  // LLM-dependent features (disabled in manual mode)
  VISION_GARDEN: !IS_MANUAL_MODE,
  VOICE_CHAT: !IS_MANUAL_MODE,
  DYNAMIC_VOCABULARY: !IS_MANUAL_MODE,
  READING_GENERATION: !IS_MANUAL_MODE,
  LANGUAGE_VALIDATION: !IS_MANUAL_MODE,
  
  // Features available in both modes
  WORD_LISTS: true,
  LEARN_MODE: true,
  QUIZ_MODE: true,
  TEMPLATES: true,
  VOCABULARY_BROWSER: true,
  WORD_DETAILS: true,
  SETTINGS: true,
  
  // Manual mode exclusive features
  ADMIN_PANEL: IS_MANUAL_MODE
};

export default {
  IS_MANUAL_MODE,
  FEATURES
};