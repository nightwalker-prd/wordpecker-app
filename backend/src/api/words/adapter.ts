import { manualWordService } from '../../services/manualWordService';
import { wordAgentService } from './agent-service';

/**
 * Adapter service that switches between LLM and manual modes
 */
export class WordServiceAdapter {
  private isManualMode: boolean;

  constructor() {
    this.isManualMode = process.env.MANUAL_DATA_MODE === 'true';
  }

  /**
   * Generate definition using appropriate service
   */
  async generateDefinition(
    word: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<string> {
    if (this.isManualMode) {
      return await manualWordService.generateDefinition(word, context, baseLanguage, targetLanguage);
    } else {
      return await wordAgentService.generateDefinition(word, context, baseLanguage, targetLanguage);
    }
  }

  /**
   * Validate answer using appropriate service
   */
  async validateAnswer(
    userAnswer: string, 
    correctAnswer: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<any> {
    if (this.isManualMode) {
      return await manualWordService.validateAnswer(userAnswer, correctAnswer, context, baseLanguage, targetLanguage);
    } else {
      return await wordAgentService.validateAnswer(userAnswer, correctAnswer, context, baseLanguage, targetLanguage);
    }
  }

  /**
   * Generate examples using appropriate service
   */
  async generateExamples(
    word: string, 
    meaning: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<any[]> {
    if (this.isManualMode) {
      return await manualWordService.generateExamples(word, meaning, context, baseLanguage, targetLanguage);
    } else {
      return await wordAgentService.generateExamples(word, meaning, context, baseLanguage, targetLanguage);
    }
  }

  /**
   * Generate similar words using appropriate service
   */
  async generateSimilarWords(
    word: string, 
    meaning: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<any> {
    if (this.isManualMode) {
      return await manualWordService.generateSimilarWords(word, meaning, context, baseLanguage, targetLanguage);
    } else {
      return await wordAgentService.generateSimilarWords(word, meaning, context, baseLanguage, targetLanguage);
    }
  }

  /**
   * Generate light reading using appropriate service
   */
  async generateLightReading(
    words: Array<{value: string, meaning: string}>, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<any> {
    if (this.isManualMode) {
      return await manualWordService.generateLightReading(words, context, baseLanguage, targetLanguage);
    } else {
      return await wordAgentService.generateLightReading(words, context, baseLanguage, targetLanguage);
    }
  }

  /**
   * Check if word exists (manual mode only)
   */
  async hasWord(word: string): Promise<boolean> {
    if (this.isManualMode) {
      return await manualWordService.hasWord(word);
    }
    // In LLM mode, assume all words can be defined
    return true;
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
      const hasData = await manualWordService.hasWord('test');
      return {
        mode: 'manual',
        available: true,
        details: {
          dataLoaded: true,
          totalWords: (await manualWordService.getAllWords()).length
        }
      };
    } else {
      return {
        mode: 'llm',
        available: !!process.env.OPENAI_API_KEY,
        details: {
          openaiConfigured: !!process.env.OPENAI_API_KEY
        }
      };
    }
  }
}

export const wordServiceAdapter = new WordServiceAdapter();