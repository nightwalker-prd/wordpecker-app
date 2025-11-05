import { exerciseTemplateService, Exercise } from './exerciseTemplateService';
import { manualDataService } from './manualDataService';

export interface ExerciseType {
  id: string;
  type: 'multiple_choice' | 'fill_in_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question: string;
  options?: string[];
  correct: string;
  word: string;
  explanation?: string;
}

export class ManualLearnService {
  constructor() {
    // Ensure data is loaded
    manualDataService.loadAllData().catch(console.error);
  }

  /**
   * Generate learning exercises using manual templates
   */
  async generateExercises(
    words: Array<{id: string, value: string, meaning: string}>, 
    context: string, 
    exerciseTypes: string[], 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<ExerciseType[]> {
    await manualDataService.loadAllData();
    
    const exercises = await exerciseTemplateService.generateExercises(
      words,
      context,
      exerciseTypes,
      baseLanguage,
      targetLanguage
    );
    
    // Convert to the expected format
    return exercises.map(exercise => ({
      id: exercise.id,
      type: exercise.type,
      question: exercise.question,
      options: exercise.options,
      correct: exercise.correct,
      word: exercise.word,
      explanation: exercise.explanation
    }));
  }

  /**
   * Validate exercise answer
   */
  async validateExerciseAnswer(
    exerciseId: string,
    userAnswer: string,
    exercise: Exercise
  ): Promise<{
    isCorrect: boolean;
    explanation: string;
    feedback: string;
  }> {
    return exerciseTemplateService.validateAnswer(userAnswer, exercise.correct, exercise);
  }

  /**
   * Get exercise statistics and recommendations
   */
  async getExerciseStats(
    words: Array<{id: string, value: string, meaning: string}>,
    context: string
  ): Promise<{
    totalWords: number;
    wordsWithExercises: number;
    availableExerciseTypes: string[];
    recommendedDifficulty: string;
  }> {
    await manualDataService.loadAllData();
    
    let wordsWithExercises = 0;
    const difficulties: string[] = [];
    
    for (const word of words) {
      const hasData = manualDataService.hasWord(word.value);
      if (hasData) {
        wordsWithExercises++;
        // Get difficulty from definition if available
        const definition = manualDataService.getDefinition(word.value, context);
        if (!definition.includes('Definition not found')) {
          difficulties.push('intermediate'); // Default difficulty
        }
      }
    }
    
    // Determine recommended difficulty based on word complexity
    const averageWordLength = words.reduce((sum, w) => sum + w.value.length, 0) / words.length;
    let recommendedDifficulty = 'beginner';
    if (averageWordLength > 6) recommendedDifficulty = 'intermediate';
    if (averageWordLength > 10) recommendedDifficulty = 'advanced';
    
    return {
      totalWords: words.length,
      wordsWithExercises,
      availableExerciseTypes: ['multiple_choice', 'fill_in_blank', 'matching', 'true_false', 'sentence_completion'],
      recommendedDifficulty
    };
  }

  /**
   * Generate exercises for a specific exercise type
   */
  async generateExercisesByType(
    words: Array<{id: string, value: string, meaning: string}>,
    context: string,
    exerciseType: string,
    baseLanguage: string,
    targetLanguage: string
  ): Promise<ExerciseType[]> {
    return this.generateExercises(
      words,
      context,
      [exerciseType],
      baseLanguage,
      targetLanguage
    );
  }

  /**
   * Get exercise difficulty recommendations
   */
  async getExerciseDifficultyRecommendations(
    words: Array<{id: string, value: string, meaning: string}>
  ): Promise<{
    beginner: string[];
    intermediate: string[];
    advanced: string[];
  }> {
    await manualDataService.loadAllData();
    
    const categorized = {
      beginner: [] as string[],
      intermediate: [] as string[],
      advanced: [] as string[]
    };
    
    for (const word of words) {
      const length = word.value.length;
      const complexity = word.meaning.split(' ').length;
      
      // Simple heuristic for difficulty categorization
      if (length <= 4 && complexity <= 10) {
        categorized.beginner.push(word.value);
      } else if (length <= 8 && complexity <= 20) {
        categorized.intermediate.push(word.value);
      } else {
        categorized.advanced.push(word.value);
      }
    }
    
    return categorized;
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
    await manualDataService.loadAllData();
    
    const missingData: string[] = [];
    const suggestions: string[] = [];
    
    for (const word of words) {
      const hasDefinition = manualDataService.hasWord(word.value);
      if (!hasDefinition) {
        missingData.push(`Definition for "${word.value}"`);
        suggestions.push(`Add definition for "${word.value}" to the manual database`);
      }
      
      const distractors = manualDataService.getDistractors(word.value, context);
      if (distractors.length < 3) {
        missingData.push(`Distractors for "${word.value}"`);
        suggestions.push(`Add more distractors for "${word.value}" (currently ${distractors.length}/3)`);
      }
    }
    
    return {
      canGenerate: missingData.length === 0,
      missingData,
      suggestions
    };
  }
}

export const manualLearnService = new ManualLearnService();