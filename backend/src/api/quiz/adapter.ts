import { manualQuizService } from '../../services/manualQuizService';
import { quizAgentService } from './agent-service';
import { QuestionType } from '../../types';

/**
 * Adapter service that switches between LLM and manual modes for quiz generation
 */
export class QuizServiceAdapter {
  private isManualMode: boolean;

  constructor() {
    this.isManualMode = process.env.MANUAL_DATA_MODE === 'true';
  }

  /**
   * Generate quiz questions using appropriate service
   */
  async generateQuestions(
    words: any[],
    context: string,
    questionTypes: QuestionType[]
  ): Promise<any[]> {
    if (this.isManualMode) {
      return await manualQuizService.generateQuestions(words, context, questionTypes);
    } else {
      return await quizAgentService.generateQuestions(words, context, questionTypes);
    }
  }

  /**
   * Get quiz statistics
   */
  async getQuizStats(
    words: any[],
    context: string
  ): Promise<any> {
    if (this.isManualMode) {
      return await manualQuizService.getQuizStats(words, context);
    } else {
      // For LLM mode, return basic stats
      return {
        totalWords: words.length,
        wordsWithQuestions: words.length, // LLM can generate for any word
        availableQuestionTypes: ['multiple_choice', 'true_false', 'fill_blank'],
        difficulty: 'mixed'
      };
    }
  }

  /**
   * Check quiz generation capability
   */
  async checkQuizGenerationCapability(
    words: any[],
    context: string
  ): Promise<{
    canGenerate: boolean;
    missingData: string[];
    suggestions: string[];
  }> {
    if (this.isManualMode) {
      return await manualQuizService.checkQuizGenerationCapability(words, context);
    } else {
      // LLM mode can always generate quizzes
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
          questionTemplatesAvailable: true
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

export const quizServiceAdapter = new QuizServiceAdapter();