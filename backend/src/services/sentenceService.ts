import { manualDataService, SentenceExample } from './manualDataService';

export interface SentenceSearchOptions {
  context?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
  includeTranslations?: boolean;
}

export interface SentenceGenerationRequest {
  word: string;
  meaning: string;
  context: string;
  baseLanguage: string;
  targetLanguage: string;
  count?: number;
}

export interface ReadingPassage {
  title: string;
  content: string;
  word_count: number;
  reading_time_minutes: number;
  highlighted_words: Array<{
    word: string;
    definition: string;
    position: number;
  }>;
  difficulty: string;
  context: string;
}

export class SentenceService {
  /**
   * Get example sentences for a word with filtering options
   */
  async getSentenceExamples(
    word: string, 
    options: SentenceSearchOptions = {}
  ): Promise<SentenceExample[]> {
    await manualDataService.loadAllData();
    
    let sentences = manualDataService.getSentenceExamples(word, options.context);
    
    // Filter by difficulty if specified
    if (options.difficulty) {
      sentences = sentences.filter(s => s.difficulty === options.difficulty);
    }
    
    // Limit results if specified
    if (options.limit) {
      sentences = sentences.slice(0, options.limit);
    }
    
    // Remove translations if not requested
    if (options.includeTranslations === false) {
      sentences = sentences.map(s => ({ ...s, translation: null }));
    }
    
    return sentences;
  }

  /**
   * Get sentences for multiple words (for reading passages)
   */
  async getSentencesForWords(
    words: string[],
    context?: string,
    difficulty?: string
  ): Promise<Map<string, SentenceExample[]>> {
    await manualDataService.loadAllData();
    
    const sentenceMap = new Map<string, SentenceExample[]>();
    
    for (const word of words) {
      const sentences = manualDataService.getSentenceExamples(word, context);
      
      let filteredSentences = sentences;
      if (difficulty) {
        filteredSentences = sentences.filter(s => s.difficulty === difficulty);
      }
      
      sentenceMap.set(word, filteredSentences);
    }
    
    return sentenceMap;
  }

  /**
   * Generate a reading passage using vocabulary words
   */
  async generateReadingPassage(
    words: Array<{value: string, meaning: string}>,
    context: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<ReadingPassage> {
    await manualDataService.loadAllData();
    
    // Get sentences for all words
    const sentenceMap = await this.getSentencesForWords(
      words.map(w => w.value),
      context,
      difficulty
    );
    
    // Create a reading passage by combining sentences
    const usedSentences: string[] = [];
    const highlightedWords: Array<{word: string, definition: string, position: number}> = [];
    
    let passageContent = '';
    let currentPosition = 0;
    
    // Add an introductory sentence based on context
    const intro = this.generateIntroSentence(context);
    passageContent += intro + ' ';
    currentPosition = intro.length + 1;
    
    // Add sentences for each word
    for (const word of words) {
      const sentences = sentenceMap.get(word.value) || [];
      
      if (sentences.length > 0) {
        // Pick the first available sentence
        const sentence = sentences[0];
        
        // Find the word position in the sentence
        const wordRegex = new RegExp(`\\b${word.value}\\b`, 'i');
        const wordMatch = sentence.sentence.match(wordRegex);
        
        if (wordMatch) {
          const wordPositionInSentence = sentence.sentence.indexOf(wordMatch[0]);
          const wordPositionInPassage = currentPosition + wordPositionInSentence;
          
          highlightedWords.push({
            word: word.value,
            definition: word.meaning,
            position: wordPositionInPassage
          });
        }
        
        passageContent += sentence.sentence + ' ';
        currentPosition = passageContent.length;
        usedSentences.push(sentence.sentence);
      }
    }
    
    // Add a concluding sentence
    const conclusion = this.generateConclusionSentence(context);
    passageContent += conclusion;
    
    // Calculate reading time (average 200 words per minute)
    const wordCount = passageContent.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);
    
    return {
      title: this.generateTitle(context),
      content: passageContent.trim(),
      word_count: wordCount,
      reading_time_minutes: readingTimeMinutes,
      highlighted_words: highlightedWords,
      difficulty,
      context
    };
  }

  /**
   * Find sentences that contain multiple vocabulary words
   */
  async findSentencesWithMultipleWords(
    words: string[],
    context?: string,
    minWords: number = 2
  ): Promise<SentenceExample[]> {
    await manualDataService.loadAllData();
    
    const allSentences: SentenceExample[] = [];
    
    // Collect all sentences for all words
    for (const word of words) {
      const sentences = manualDataService.getSentenceExamples(word, context);
      allSentences.push(...sentences);
    }
    
    // Find sentences that contain multiple target words
    const validSentences = allSentences.filter(sentence => {
      const wordsInSentence = words.filter(word => 
        sentence.sentence.toLowerCase().includes(word.toLowerCase())
      );
      return wordsInSentence.length >= minWords;
    });
    
    // Remove duplicates
    const uniqueSentences = validSentences.filter((sentence, index, self) =>
      index === self.findIndex(s => s.sentence === sentence.sentence)
    );
    
    return uniqueSentences;
  }

  /**
   * Get sentences by difficulty level across all words
   */
  async getSentencesByDifficulty(
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    context?: string,
    limit?: number
  ): Promise<SentenceExample[]> {
    await manualDataService.loadAllData();
    
    const allWords = manualDataService.getAllWords();
    const sentences: SentenceExample[] = [];
    
    for (const word of allWords) {
      const wordSentences = manualDataService.getSentenceExamples(word, context);
      const filteredSentences = wordSentences.filter(s => s.difficulty === difficulty);
      sentences.push(...filteredSentences);
    }
    
    // Shuffle and limit if requested
    const shuffled = this.shuffleArray(sentences);
    return limit ? shuffled.slice(0, limit) : shuffled;
  }

  /**
   * Add new sentence examples for a word
   */
  async addSentenceExamples(
    word: string,
    sentences: Omit<SentenceExample, 'audio_file'>[]
  ): Promise<void> {
    const fullSentences: SentenceExample[] = sentences.map(s => ({
      ...s,
      audio_file: `${word}_${s.context}_${Date.now()}.mp3`
    }));
    
    await manualDataService.addSentenceExamples(word, fullSentences);
  }

  /**
   * Validate if a sentence properly uses a word
   */
  validateSentenceUsage(sentence: string, word: string, expectedMeaning: string): {
    isValid: boolean;
    feedback: string;
    suggestions: string[];
  } {
    const containsWord = sentence.toLowerCase().includes(word.toLowerCase());
    
    if (!containsWord) {
      return {
        isValid: false,
        feedback: `The sentence should contain the word "${word}".`,
        suggestions: [
          `Try using "${word}" in your sentence.`,
          `Make sure to spell "${word}" correctly.`
        ]
      };
    }
    
    // Basic validation - in a real implementation, this could be more sophisticated
    const isValid = sentence.length > 10 && sentence.includes(' ');
    
    return {
      isValid,
      feedback: isValid 
        ? `Good use of "${word}" in context!` 
        : `The sentence could be improved to better demonstrate the meaning of "${word}".`,
      suggestions: isValid ? [] : [
        `Try to show the meaning of "${word}" more clearly.`,
        `Consider adding more context to your sentence.`,
        `Make sure your sentence demonstrates: ${expectedMeaning}`
      ]
    };
  }

  // Private helper methods

  private generateIntroSentence(context: string): string {
    const intros = {
      business: "In the business world, understanding key terminology is essential.",
      daily: "In our everyday lives, we encounter many important concepts.",
      technology: "Modern technology relies on specific terminology that's important to understand.",
      sports: "Sports and athletic activities involve specialized vocabulary.",
      geography: "Understanding geographical terms helps us describe the world around us.",
      academic: "Academic study requires familiarity with specialized vocabulary.",
      default: "Learning new vocabulary helps us communicate more effectively."
    };
    
    return intros[context as keyof typeof intros] || intros.default;
  }

  private generateConclusionSentence(context: string): string {
    const conclusions = {
      business: "These terms form the foundation of business communication.",
      daily: "These words help us express ourselves in daily conversations.",
      technology: "Understanding these terms is key to navigating the digital world.",
      sports: "This vocabulary is essential for discussing athletic activities.",
      geography: "These terms help us describe and understand our physical world.",
      academic: "This vocabulary is fundamental for academic success.",
      default: "Mastering these words will improve your communication skills."
    };
    
    return conclusions[context as keyof typeof conclusions] || conclusions.default;
  }

  private generateTitle(context: string): string {
    const titles = {
      business: "Business Vocabulary in Context",
      daily: "Everyday English Conversations",
      technology: "Technology Terms and Usage",
      sports: "Sports and Athletic Vocabulary",
      geography: "Geographical Terms and Descriptions",
      academic: "Academic Vocabulary in Practice",
      default: "Vocabulary in Context"
    };
    
    return titles[context as keyof typeof titles] || titles.default;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const sentenceService = new SentenceService();