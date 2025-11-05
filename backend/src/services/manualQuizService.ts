import { manualDataService } from './manualDataService';
import { exerciseTemplateService } from './exerciseTemplateService';
import { QuestionType } from '../types';

/**
 * Manual Quiz Service - Generates quiz questions using pre-defined templates and data
 */
export class ManualQuizService {
  /**
   * Generate quiz questions from word data
   */
  async generateQuestions(
    words: any[],
    context: string,
    questionTypes: QuestionType[]
  ): Promise<any[]> {
    const questions = [];
    
    // Ensure data is loaded
    await manualDataService.loadAllData();
    
    for (const word of words) {
      try {
        // Get definition for the word
        const definition = manualDataService.getDefinition(word.value, context);
        
        if (!definition || definition.includes('Definition not found')) {
          console.warn(`No definition found for word: ${word.value} in context: ${context}`);
          continue;
        }
        
        // Select question type (prefer multiple choice for quizzes)
        const questionType = questionTypes.includes('multiple_choice') 
          ? 'multiple_choice' 
          : questionTypes[0] || 'multiple_choice';
        
        // Generate exercise and convert to quiz question format
        const exercises = await exerciseTemplateService.generateExercises(
          [{ id: word.id, value: word.value, meaning: definition }],
          context,
          [questionType],
          'English', // Default base language
          'English'  // Default target language
        );
        
        if (exercises.length > 0) {
          const exercise = exercises[0];
          
          // Convert exercise to quiz question format
          const question = {
            id: `quiz_${word.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: exercise.type,
            question: exercise.question,
            options: exercise.options || [],
            correct: exercise.correct,
            word: word.value,
            points: this.calculatePoints(questionType),
            difficulty: this.assessDifficulty(word.value, context)
          };
          
          questions.push(question);
        }
      } catch (error) {
        console.error(`Error generating question for word ${word.value}:`, error);
        // Continue with other words
      }
    }
    
    // Shuffle questions for variety
    return this.shuffleArray(questions);
  }
  
  /**
   * Get quiz statistics
   */
  async getQuizStats(words: any[], context: string): Promise<any> {
    let wordsWithDefinitions = 0;
    let totalDifficulty = 0;
    
    for (const word of words) {
      const definition = manualDataService.getDefinition(word.value, context);
      if (definition && !definition.includes('Definition not found')) {
        wordsWithDefinitions++;
        totalDifficulty += this.assessDifficultyScore(word.value, context);
      }
    }
    
    return {
      totalWords: words.length,
      wordsWithQuestions: wordsWithDefinitions,
      coveragePercentage: Math.round((wordsWithDefinitions / words.length) * 100),
      averageDifficulty: wordsWithDefinitions > 0 ? Math.round(totalDifficulty / wordsWithDefinitions) : 0,
      availableQuestionTypes: ['multiple_choice', 'true_false', 'fill_blank'],
      estimatedDuration: Math.ceil(wordsWithDefinitions * 30 / 60), // 30 seconds per question
      recommendedQuestionTypes: this.getRecommendedQuestionTypes(context)
    };
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
    const missingData: string[] = [];
    const suggestions: string[] = [];
    let wordsWithData = 0;
    
    for (const word of words) {
      const definition = manualDataService.getDefinition(word.value, context);
      const distractors = manualDataService.getDistractors(word.value, context);
      
      if (!definition || definition.includes('Definition not found')) {
        missingData.push(`Definition for "${word.value}"`);
      } else {
        wordsWithData++;
      }
      
      if (distractors.length < 3) {
        missingData.push(`Distractors for "${word.value}" (has ${distractors.length}, needs 3+)`);
      }
    }
    
    const canGenerate = wordsWithData > 0;
    const coverage = Math.round((wordsWithData / words.length) * 100);
    
    if (!canGenerate) {
      suggestions.push('Add definitions for the words in your vocabulary list');
      suggestions.push('Ensure words have proper context mapping');
    } else if (coverage < 70) {
      suggestions.push(`Only ${coverage}% of words have complete data. Consider adding more definitions.`);
      suggestions.push('Add more distractors for better multiple choice questions');
    }
    
    if (missingData.length > 10) {
      suggestions.push('Consider using a different context that has more complete data');
    }
    
    return {
      canGenerate,
      missingData: missingData.slice(0, 10), // Limit to first 10 for readability
      suggestions
    };
  }
  
  // Private helper methods
  
  private calculatePoints(questionType: QuestionType): number {
    const pointsMap: Record<QuestionType, number> = {
      'multiple_choice': 10,
      'true_false': 5,
      'fill_blank': 15,
      'matching': 20,
      'sentence_completion': 25
    };
    return pointsMap[questionType] || 10;
  }
  
  private assessDifficulty(word: string, context: string): 'easy' | 'medium' | 'hard' {
    const difficultyScore = this.assessDifficultyScore(word, context);
    
    if (difficultyScore <= 3) return 'easy';
    if (difficultyScore <= 6) return 'medium';
    return 'hard';
  }
  
  private assessDifficultyScore(word: string, context: string): number {
    let score = 0;
    
    // Word length factor
    if (word.length > 8) score += 2;
    if (word.length > 12) score += 1;
    
    // Context complexity
    const complexContexts = ['academic', 'legal', 'medical', 'technology'];
    if (complexContexts.includes(context.toLowerCase())) score += 2;
    
    // Common word check (this would be enhanced with frequency data)
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with'];
    if (commonWords.includes(word.toLowerCase())) score -= 2;
    
    return Math.max(1, Math.min(10, score)); // Clamp between 1-10
  }
  
  private getRecommendedQuestionTypes(context: string): QuestionType[] {
    const contextTypeMap: Record<string, QuestionType[]> = {
      'business': ['multiple_choice', 'fill_blank'],
      'daily': ['multiple_choice', 'true_false'],
      'academic': ['fill_blank', 'sentence_completion'],
      'technology': ['multiple_choice', 'matching'],
      'medical': ['multiple_choice', 'fill_blank'],
      'legal': ['fill_blank', 'sentence_completion']
    };
    
    return contextTypeMap[context.toLowerCase()] || ['multiple_choice', 'true_false'];
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
export const manualQuizService = new ManualQuizService();