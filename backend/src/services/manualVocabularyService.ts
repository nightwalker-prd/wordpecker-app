import { manualDataService } from './manualDataService';

/**
 * Manual Vocabulary Service - Manages vocabulary operations using local data
 */
export class ManualVocabularyService {
  /**
   * Generate vocabulary words from local data
   */
  async generateWords(
    count: number,
    difficulty: string,
    context: string,
    baseLanguage: string,
    targetLanguage: string,
    excludeWords: string[] = []
  ): Promise<any[]> {
    // Ensure data is loaded
    await manualDataService.loadAllData();
    
    // Get all available words for the context
    const allWords = manualDataService.getAllWords();
    const contextWords = allWords.filter(word => {
      const definition = manualDataService.getDefinition(word, context);
      return definition && !definition.includes('Definition not found');
    });
    
    // Filter out excluded words
    const availableWords = contextWords.filter(word => 
      !excludeWords.some(excluded => excluded.toLowerCase() === word.toLowerCase())
    );
    
    // Filter by difficulty if possible (this would require difficulty metadata in the data)
    const filteredWords = this.filterByDifficulty(availableWords, difficulty, context);
    
    // Shuffle and take the requested count
    const shuffled = this.shuffleArray(filteredWords);
    const selectedWords = shuffled.slice(0, Math.min(count, shuffled.length));
    
    // Generate word objects with details
    return selectedWords.map(word => {
      const definition = manualDataService.getDefinition(word, context);
      const examples = manualDataService.getSentenceExamples(word);
      const similarWords = manualDataService.getSimilarWords(word);
      
      return {
        word: word,
        meaning: definition,
        example: examples.length > 0 ? examples[0].sentence : `Example sentence for "${word}" would go here.`,
        difficulty_level: this.assessWordDifficulty(word, context),
        context: context,
        part_of_speech: this.getPartOfSpeech(word),
        similar_words: similarWords.slice(0, 3), // Top 3 similar words
        pronunciation: this.getPronunciation(word)
      };
    });
  }
  
  /**
   * Get detailed information about a specific word
   */
  async getWordDetails(
    word: string,
    context: string,
    baseLanguage: string,
    targetLanguage: string
  ): Promise<any> {
    // Ensure data is loaded
    await manualDataService.loadAllData();
    
    const definition = manualDataService.getDefinition(word, context);
    if (!definition || definition.includes('Definition not found')) {
      throw new Error(`Word "${word}" not found in context "${context}"`);
    }
    
    const examples = manualDataService.getSentenceExamples(word);
    const similarWords = manualDataService.getSimilarWords(word);
    
    return {
      word: word,
      meaning: definition,
      example: examples.length > 0 
        ? examples[0].sentence 
        : `Example: "${word}" is commonly used in ${context} contexts.`,
      difficulty_level: this.assessWordDifficulty(word, context),
      context: context,
      part_of_speech: this.getPartOfSpeech(word),
      similar_words: similarWords,
      pronunciation: this.getPronunciation(word),
      etymology: this.getEtymology(word),
      usage_notes: this.getUsageNotes(word, context),
      frequency: this.getWordFrequency(word),
      translations: this.getTranslations(word, baseLanguage, targetLanguage)
    };
  }
  
  /**
   * Get vocabulary statistics for a context
   */
  async getVocabularyStats(context: string): Promise<any> {
    const allWords = manualDataService.getAllWords();
    const contextWords = allWords.filter(word => {
      const definition = manualDataService.getDefinition(word, context);
      return definition && !definition.includes('Definition not found');
    });
    
    const difficulties = {
      basic: 0,
      intermediate: 0,
      advanced: 0
    };
    
    contextWords.forEach(word => {
      const difficulty = this.assessWordDifficulty(word, context);
      if (difficulty in difficulties) {
        difficulties[difficulty as keyof typeof difficulties]++;
      }
    });
    
    return {
      totalWords: contextWords.length,
      availableContexts: this.getAvailableContexts(),
      difficultyDistribution: difficulties,
      averageWordLength: contextWords.reduce((sum, word) => sum + word.length, 0) / contextWords.length,
      mostCommonWords: this.getMostCommonWords(contextWords, 10),
      recentlyAdded: [] // This would require timestamp data
    };
  }
  
  /**
   * Check vocabulary generation capability for a context
   */
  async checkVocabularyCapability(context: string): Promise<{
    canGenerate: boolean;
    availableWords: number;
    coverage: string;
    suggestions: string[];
  }> {
    const allWords = manualDataService.getAllWords();
    const contextWords = allWords.filter(word => {
      const definition = manualDataService.getDefinition(word, context);
      return definition && !definition.includes('Definition not found');
    });
    
    const canGenerate = contextWords.length > 0;
    const suggestions: string[] = [];
    
    if (!canGenerate) {
      suggestions.push(`No vocabulary found for context "${context}"`);
      suggestions.push('Check if the context name is correct');
      suggestions.push('Add vocabulary data for this context');
    } else if (contextWords.length < 10) {
      suggestions.push(`Limited vocabulary available (${contextWords.length} words)`);
      suggestions.push('Consider adding more words for better variety');
    } else if (contextWords.length < 50) {
      suggestions.push('Moderate vocabulary available - consider expanding');
    }
    
    let coverage = 'excellent';
    if (contextWords.length < 10) coverage = 'poor';
    else if (contextWords.length < 30) coverage = 'limited';
    else if (contextWords.length < 100) coverage = 'good';
    
    return {
      canGenerate,
      availableWords: contextWords.length,
      coverage,
      suggestions
    };
  }
  
  // Private helper methods
  
  private filterByDifficulty(words: string[], difficulty: string, context: string): string[] {
    return words.filter(word => {
      const wordDifficulty = this.assessWordDifficulty(word, context);
      return wordDifficulty === difficulty;
    });
  }
  
  private assessWordDifficulty(word: string, context: string): 'basic' | 'intermediate' | 'advanced' {
    // Simple heuristic - in a real implementation, this would use metadata
    const length = word.length;
    const complexContexts = ['academic', 'legal', 'medical', 'technology'];
    const isComplexContext = complexContexts.includes(context.toLowerCase());
    
    if (length <= 5 && !isComplexContext) return 'basic';
    if (length <= 8 && !isComplexContext) return 'intermediate';
    return 'advanced';
  }
  
  private getPartOfSpeech(word: string): string {
    // Simple heuristic - in a real implementation, this would come from data
    const commonNouns = ['book', 'house', 'car', 'tree', 'person'];
    const commonVerbs = ['run', 'walk', 'eat', 'think', 'write'];
    const commonAdjectives = ['big', 'small', 'beautiful', 'difficult', 'easy'];
    
    if (commonNouns.includes(word.toLowerCase())) return 'noun';
    if (commonVerbs.includes(word.toLowerCase())) return 'verb';
    if (commonAdjectives.includes(word.toLowerCase())) return 'adjective';
    
    // Default guess based on word ending
    if (word.endsWith('ing')) return 'verb';
    if (word.endsWith('ly')) return 'adverb';
    if (word.endsWith('ed')) return 'verb';
    
    return 'noun'; // Default
  }
  
  private getPronunciation(word: string): string {
    // Placeholder - in a real implementation, this would come from pronunciation data
    return `/${word}/`; // Simplified phonetic representation
  }
  
  private getEtymology(word: string): string {
    // Placeholder - would come from etymology database
    return `Etymology for "${word}" not available in manual mode.`;
  }
  
  private getUsageNotes(word: string, context: string): string {
    // Placeholder - would come from usage database
    return `"${word}" is commonly used in ${context} contexts.`;
  }
  
  private getWordFrequency(word: string): 'common' | 'uncommon' | 'rare' {
    // Simple heuristic - would come from frequency data
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to'];
    if (commonWords.includes(word.toLowerCase())) return 'common';
    if (word.length <= 6) return 'common';
    if (word.length <= 10) return 'uncommon';
    return 'rare';
  }
  
  private getTranslations(word: string, baseLanguage: string, targetLanguage: string): Record<string, string> {
    // Placeholder - would come from translation database
    return {
      [baseLanguage]: word,
      [targetLanguage]: `[${targetLanguage} translation of "${word}"]`
    };
  }
  
  private getAvailableContexts(): string[] {
    // Get contexts from manualDataService
    return ['business', 'daily', 'technology', 'academic', 'sports', 'travel'];
  }
  
  private getMostCommonWords(words: string[], count: number): string[] {
    // Sort by frequency (simplified - by length for now)
    return words
      .sort((a, b) => a.length - b.length)
      .slice(0, count);
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
export const manualVocabularyService = new ManualVocabularyService();