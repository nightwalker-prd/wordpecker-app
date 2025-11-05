/**
 * Arabic Language Support Utilities
 */

// RTL (Right-to-Left) languages
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Arabic language detection
export const isArabic = (languageCode: string): boolean => {
  return languageCode === 'ar';
};

// RTL language detection
export const isRTL = (languageCode: string): boolean => {
  return RTL_LANGUAGES.includes(languageCode);
};

// Get text direction for language
export const getTextDirection = (languageCode: string): 'ltr' | 'rtl' => {
  return isRTL(languageCode) ? 'rtl' : 'ltr';
};

// Get appropriate font family for Arabic
export const getLanguageFontFamily = (languageCode: string): string => {
  if (isArabic(languageCode)) {
    return "'Noto Sans Arabic', 'Arial Unicode MS', Arial, sans-serif";
  }
  return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
};

// Arabic text styling utilities
export const getArabicTextStyles = (languageCode: string) => {
  if (!isArabic(languageCode)) {
    return {};
  }

  return {
    direction: 'rtl' as const,
    textAlign: 'right' as const,
    fontFamily: getLanguageFontFamily(languageCode),
    lineHeight: '1.8', // Better line height for Arabic
    letterSpacing: 'normal', // Reset letter spacing for Arabic
  };
};

// Mix text styles for bilingual content (Arabic + other language)
export const getBilingualTextStyles = (
  primaryLanguage: string, 
  secondaryLanguage: string
) => {
  const isArabicPrimary = isArabic(primaryLanguage);
  const isArabicSecondary = isArabic(secondaryLanguage);

  if (isArabicPrimary || isArabicSecondary) {
    return {
      direction: isArabicPrimary ? 'rtl' : 'ltr',
      fontFamily: `${getLanguageFontFamily('ar')}, ${getLanguageFontFamily('en')}`,
      lineHeight: '1.8',
    };
  }

  return {};
};

// Format Arabic text with proper diacritics support
export const formatArabicText = (text: string, options?: {
  removeDiacritics?: boolean;
  addZWNJ?: boolean; // Zero-width non-joiner for better display
}): string => {
  if (!text) return text;

  let formatted = text;

  // Remove diacritics if requested (for simplified display)
  if (options?.removeDiacritics) {
    formatted = formatted.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  }

  // Add ZWNJ for better character separation if needed
  if (options?.addZWNJ) {
    formatted = formatted.replace(/(\u0628|\u062A|\u062B|\u0646|\u064A)/g, '$1\u200C');
  }

  return formatted;
};

// Validate Arabic text input
export const validateArabicText = (text: string): {
  isValid: boolean;
  hasArabicCharacters: boolean;
  hasLatinCharacters: boolean;
  issues: string[];
} => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  const latinPattern = /[A-Za-z]/;
  
  const hasArabicCharacters = arabicPattern.test(text);
  const hasLatinCharacters = latinPattern.test(text);
  const issues: string[] = [];

  // Check for mixed scripts (might be intentional for transliteration)
  if (hasArabicCharacters && hasLatinCharacters) {
    issues.push('Mixed Arabic and Latin characters detected');
  }

  // Check for common Arabic input issues
  if (hasArabicCharacters) {
    // Check for Latin numbers in Arabic text (suggest Arabic-Indic numerals)
    if (/[0-9]/.test(text)) {
      issues.push('Consider using Arabic-Indic numerals (٠-٩) instead of Latin numbers');
    }
  }

  return {
    isValid: true, // We don't invalidate, just warn
    hasArabicCharacters,
    hasLatinCharacters,
    issues
  };
};

// Convert Latin numerals to Arabic-Indic numerals
export const convertToArabicNumerals = (text: string): string => {
  const numeralMap: Record<string, string> = {
    '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
    '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
  };

  return text.replace(/[0-9]/g, (match) => numeralMap[match] || match);
};

// Arabic language learning helpers
export const arabicLearningHelpers = {
  // Common Arabic particles and conjunctions
  particles: ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'بعد', 'قبل', 'تحت', 'فوق'],
  
  // Common Arabic question words
  questionWords: ['ما', 'من', 'متى', 'أين', 'كيف', 'لماذا', 'كم', 'أي'],
  
  // Arabic pronouns
  pronouns: ['أنا', 'أنت', 'أنتِ', 'هو', 'هي', 'نحن', 'أنتم', 'أنتن', 'هم', 'هن'],
  
  // Check if word is a common Arabic function word
  isCommonFunctionWord: (word: string): boolean => {
    const allFunctionWords = [
      ...arabicLearningHelpers.particles,
      ...arabicLearningHelpers.questionWords,
      ...arabicLearningHelpers.pronouns
    ];
    return allFunctionWords.includes(word);
  }
};

export default {
  isArabic,
  isRTL,
  getTextDirection,
  getLanguageFontFamily,
  getArabicTextStyles,
  getBilingualTextStyles,
  formatArabicText,
  validateArabicText,
  convertToArabicNumerals,
  arabicLearningHelpers
};