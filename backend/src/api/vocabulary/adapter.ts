import { manualVocabularyService } from '../../services/manualVocabularyService';
import { vocabularyAgentService } from './agent-service';

/**
 * Adapter service that switches between LLM and manual modes for vocabulary
 */
export class VocabularyServiceAdapter {
  private isManualMode: boolean;

  constructor() {
    this.isManualMode = process.env.MANUAL_DATA_MODE === 'true';
  }

  /**
   * Generate vocabulary words using appropriate service
   */
  async generateWords(
    count: number,
    difficulty: string,
    context: string,
    baseLanguage: string,
    targetLanguage: string,
    excludeWords: string[] = []
  ): Promise<any[]> {
    if (this.isManualMode) {
      return await manualVocabularyService.generateWords(
        count, difficulty, context, baseLanguage, targetLanguage, excludeWords
      );
    } else {
      return await vocabularyAgentService.generateWords(
        count, difficulty, context, baseLanguage, targetLanguage, excludeWords
      );
    }
  }

  /**
   * Get detailed word information using appropriate service
   */
  async getWordDetails(
    word: string,
    context: string,
    baseLanguage: string,
    targetLanguage: string
  ): Promise<any> {
    if (this.isManualMode) {
      return await manualVocabularyService.getWordDetails(
        word, context, baseLanguage, targetLanguage
      );
    } else {
      return await vocabularyAgentService.getWordDetails(
        word, context, baseLanguage, targetLanguage
      );
    }
  }

  /**
   * Get vocabulary statistics
   */
  async getVocabularyStats(context: string): Promise<any> {
    if (this.isManualMode) {
      return await manualVocabularyService.getVocabularyStats(context);
    } else {
      // For LLM mode, return basic stats
      return {
        mode: 'llm',
        message: 'LLM mode can generate unlimited vocabulary',
        availableContexts: ['any context requested'],
        capabilities: ['dynamic generation', 'context adaptation', 'difficulty adjustment']
      };
    }
  }

  /**
   * Check vocabulary generation capability
   */
  async checkVocabularyCapability(context: string): Promise<{
    canGenerate: boolean;
    availableWords?: number;
    coverage?: string;
    suggestions: string[];
  }> {
    if (this.isManualMode) {
      return await manualVocabularyService.checkVocabularyCapability(context);
    } else {
      // LLM mode can always generate vocabulary
      return {
        canGenerate: !!process.env.OPENAI_API_KEY,
        suggestions: process.env.OPENAI_API_KEY 
          ? ['LLM mode can generate vocabulary for any context']
          : ['OpenAI API key required for vocabulary generation']
      };
    }
  }

  /**
   * Search for words by criteria
   */
  async searchWords(
    query: string,
    context?: string,
    difficulty?: string,
    limit: number = 10
  ): Promise<any[]> {
    if (this.isManualMode) {
      // For manual mode, we'd search through local data
      // This is a simplified implementation
      const allWords = await manualVocabularyService.generateWords(
        100, difficulty || 'intermediate', context || 'general', 'English', 'English'
      );
      
      return allWords
        .filter(wordData => 
          wordData.word.toLowerCase().includes(query.toLowerCase()) ||
          wordData.meaning.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit);
    } else {
      // For LLM mode, this would use agent search capabilities
      throw new Error('Search not implemented for LLM mode');
    }
  }

  /**
   * Get word suggestions based on existing vocabulary
   */
  async getWordSuggestions(
    existingWords: string[],
    context: string,
    count: number = 5
  ): Promise<any[]> {
    if (this.isManualMode) {
      // Generate suggestions based on similar words and context
      const suggestions = new Set<string>();
      
      for (const word of existingWords) {
        try {
          const similarWords = await manualVocabularyService.getWordDetails(
            word, context, 'English', 'English'
          );
          similarWords.similar_words.forEach((similar: string) => suggestions.add(similar));
        } catch (error) {
          // Continue with other words if one fails
        }
      }
      
      const suggestionArray = Array.from(suggestions);
      return suggestionArray.slice(0, count).map(word => ({
        word,
        reason: 'Similar to existing vocabulary',
        confidence: 0.8
      }));
    } else {
      // For LLM mode, this would use agent suggestions
      throw new Error('Suggestions not implemented for LLM mode');
    }
  }

  /**
   * Get mode information
   */
  getMode(): 'manual' | 'llm' {
    return this.isManualMode ? 'manual' : 'llm';
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    mode: string;
    available: boolean;
    details?: any;
  }> {
    if (this.isManualMode) {
      const capability = await manualVocabularyService.checkVocabularyCapability('general');
      return {
        mode: 'manual',
        available: capability.canGenerate,
        details: {
          dataLoaded: true,
          vocabularyAvailable: capability.availableWords || 0,
          coverage: capability.coverage
        }
      };
    } else {
      return {
        mode: 'llm',
        available: !!process.env.OPENAI_API_KEY,
        details: {
          openaiConfigured: !!process.env.OPENAI_API_KEY,
          capabilities: ['dynamic_generation', 'context_adaptation']
        }
      };
    }
  }
}

export const vocabularyServiceAdapter = new VocabularyServiceAdapter();