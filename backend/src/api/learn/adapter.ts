import { manualLearnService } from '../../services/manualLearnService';
import { learnAgentService } from './agent-service';

/**
 * Adapter service that switches between LLM and manual modes for learning
 */
export class LearnServiceAdapter {
  private isManualMode: boolean;

  constructor() {
    this.isManualMode = process.env.MANUAL_DATA_MODE === 'true';
  }

  /**
   * Generate exercises using appropriate service
   */
  async generateExercises(
    words: Array<{id: string, value: string, meaning: string}>, 
    context: string, 
    exerciseTypes: string[], 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<any[]> {
    if (this.isManualMode) {
      return await manualLearnService.generateExercises(words, context, exerciseTypes, baseLanguage, targetLanguage);
    } else {
      return await learnAgentService.generateExercises(words, context, exerciseTypes, baseLanguage, targetLanguage);
    }
  }

  /**
   * Get exercise statistics
   */
  async getExerciseStats(
    words: Array<{id: string, value: string, meaning: string}>,
    context: string
  ): Promise<any> {
    if (this.isManualMode) {
      return await manualLearnService.getExerciseStats(words, context);
    } else {
      // For LLM mode, return basic stats
      return {
        totalWords: words.length,
        wordsWithExercises: words.length, // LLM can generate for any word
        availableExerciseTypes: ['multiple_choice', 'fill_blank', 'true_false', 'matching', 'sentence_completion'],
        recommendedDifficulty: 'intermediate'
      };
    }
  }

  /**
   * Check exercise generation capability
   */
  async checkExerciseGenerationCapability(
    words: Array<{id: string, value: string, meaning: string}>,
    context: string
  ): Promise<{
    canGenerate: boolean;
    missingData: string[];
    suggestions: string[];
  }> {
    if (this.isManualMode) {
      return await manualLearnService.checkExerciseGenerationCapability(words, context);
    } else {
      // LLM mode can always generate exercises
      return {
        canGenerate: true,
        missingData: [],
        suggestions: []
      };
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
      return {
        mode: 'manual',
        available: true,
        details: {
          dataLoaded: true,
          exerciseTemplatesAvailable: true
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

export const learnServiceAdapter = new LearnServiceAdapter();