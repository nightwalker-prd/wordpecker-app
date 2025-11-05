import { manualDataService, Definition, ExerciseTemplate } from './manualDataService';

export interface Exercise {
  id: string;
  type: 'multiple_choice' | 'fill_in_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question: string;
  options?: string[];
  correct: string;
  word: string;
  context?: string;
  difficulty: string;
  explanation?: string;
}

export interface ExerciseGenerationOptions {
  exerciseTypes: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  context?: string;
}

export class ExerciseTemplateService {
  /**
   * Generate exercises for a list of words using templates
   */
  async generateExercises(
    words: Array<{id: string, value: string, meaning: string}>,
    context: string,
    exerciseTypes: string[],
    baseLanguage: string,
    targetLanguage: string
  ): Promise<Exercise[]> {
    const exercises: Exercise[] = [];
    
    // Ensure manual data is loaded
    await manualDataService.loadAllData();
    
    for (const word of words) {
      const wordExercise = this.generateExerciseForWord(
        word,
        context,
        exerciseTypes,
        baseLanguage,
        targetLanguage
      );
      if (wordExercise) {
        exercises.push(wordExercise);
      }
    }
    
    return exercises;
  }

  /**
   * Generate a single exercise for a word
   */
  private generateExerciseForWord(
    word: {id: string, value: string, meaning: string},
    context: string,
    exerciseTypes: string[],
    baseLanguage: string,
    targetLanguage: string
  ): Exercise | null {
    // Pick a random exercise type from the allowed types
    const exerciseType = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
    
    switch (exerciseType) {
      case 'multiple_choice':
        return this.generateMultipleChoice(word, context);
      case 'fill_in_blank':
        return this.generateFillInBlank(word, context);
      case 'matching':
        return this.generateMatching(word, context);
      case 'true_false':
        return this.generateTrueFalse(word, context);
      case 'sentence_completion':
        return this.generateSentenceCompletion(word, context);
      default:
        console.warn(`Unknown exercise type: ${exerciseType}`);
        return this.generateMultipleChoice(word, context); // Fallback
    }
  }

  /**
   * Generate multiple choice exercise
   */
  private generateMultipleChoice(
    word: {id: string, value: string, meaning: string},
    context: string
  ): Exercise {
    const distractors = manualDataService.getDistractors(word.value, context);
    const allOptions = [word.meaning, ...distractors.slice(0, 3)];
    
    // Shuffle options
    const shuffledOptions = this.shuffleArray(allOptions);
    
    return {
      id: `mc_${word.id}_${Date.now()}`,
      type: 'multiple_choice',
      question: `What does "${word.value}" mean${context ? ` in the context of ${context}` : ''}?`,
      options: shuffledOptions,
      correct: word.meaning,
      word: word.value,
      context,
      difficulty: this.getDifficultyForWord(word.value),
      explanation: `"${word.value}" means: ${word.meaning}`
    };
  }

  /**
   * Generate fill in the blank exercise
   */
  private generateFillInBlank(
    word: {id: string, value: string, meaning: string},
    context: string
  ): Exercise {
    const sentences = manualDataService.getSentenceExamples(word.value, context);
    
    if (sentences.length > 0) {
      // Use an actual sentence example
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      const questionSentence = sentence.sentence.replace(
        new RegExp(`\\b${word.value}\\b`, 'gi'), 
        '_____'
      );
      
      return {
        id: `fib_${word.id}_${Date.now()}`,
        type: 'fill_in_blank',
        question: `Fill in the blank: ${questionSentence}`,
        correct: word.value,
        word: word.value,
        context,
        difficulty: this.getDifficultyForWord(word.value),
        explanation: `The correct word is "${word.value}" which means: ${word.meaning}`
      };
    } else {
      // Generate a basic fill-in-the-blank
      return {
        id: `fib_${word.id}_${Date.now()}`,
        type: 'fill_in_blank',
        question: `Complete the sentence: "I need to use the _____ to complete this task." (Hint: ${word.meaning})`,
        correct: word.value,
        word: word.value,
        context,
        difficulty: this.getDifficultyForWord(word.value),
        explanation: `The correct word is "${word.value}"`
      };
    }
  }

  /**
   * Generate matching exercise
   */
  private generateMatching(
    word: {id: string, value: string, meaning: string},
    context: string
  ): Exercise {
    // For matching, we'll present the word and ask to match with its definition
    const distractors = manualDataService.getDistractors(word.value, context);
    const allOptions = [word.meaning, ...distractors.slice(0, 3)];
    const shuffledOptions = this.shuffleArray(allOptions);
    
    return {
      id: `match_${word.id}_${Date.now()}`,
      type: 'matching',
      question: `Match "${word.value}" with its correct definition:`,
      options: shuffledOptions,
      correct: word.meaning,
      word: word.value,
      context,
      difficulty: this.getDifficultyForWord(word.value),
      explanation: `"${word.value}" matches with: ${word.meaning}`
    };
  }

  /**
   * Generate true/false exercise
   */
  private generateTrueFalse(
    word: {id: string, value: string, meaning: string},
    context: string
  ): Exercise {
    const isTrue = Math.random() > 0.5;
    let statement: string;
    let correctAnswer: string;
    
    if (isTrue) {
      statement = `"${word.value}" means: ${word.meaning}`;
      correctAnswer = 'True';
    } else {
      const distractors = manualDataService.getDistractors(word.value, context);
      const falseDefinition = distractors[0] || 'an incorrect definition';
      statement = `"${word.value}" means: ${falseDefinition}`;
      correctAnswer = 'False';
    }
    
    return {
      id: `tf_${word.id}_${Date.now()}`,
      type: 'true_false',
      question: `True or False: ${statement}`,
      options: ['True', 'False'],
      correct: correctAnswer,
      word: word.value,
      context,
      difficulty: this.getDifficultyForWord(word.value),
      explanation: `The correct answer is ${correctAnswer}. "${word.value}" means: ${word.meaning}`
    };
  }

  /**
   * Generate sentence completion exercise
   */
  private generateSentenceCompletion(
    word: {id: string, value: string, meaning: string},
    context: string
  ): Exercise {
    const sentences = manualDataService.getSentenceExamples(word.value, context);
    
    if (sentences.length > 0) {
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      const words = sentence.sentence.split(' ');
      const wordIndex = words.findIndex(w => 
        w.toLowerCase().includes(word.value.toLowerCase())
      );
      
      if (wordIndex !== -1) {
        // Remove the target word and ask to complete
        const incompleteSentence = words
          .map((w, i) => i === wordIndex ? '_____' : w)
          .join(' ');
        
        return {
          id: `sc_${word.id}_${Date.now()}`,
          type: 'sentence_completion',
          question: `Complete this sentence: ${incompleteSentence}`,
          correct: word.value,
          word: word.value,
          context,
          difficulty: this.getDifficultyForWord(word.value),
          explanation: `The complete sentence is: ${sentence.sentence}`
        };
      }
    }
    
    // Fallback to a generic sentence completion
    return {
      id: `sc_${word.id}_${Date.now()}`,
      type: 'sentence_completion',
      question: `Use "${word.value}" in a sentence that demonstrates its meaning: ${word.meaning}`,
      correct: word.value,
      word: word.value,
      context,
      difficulty: this.getDifficultyForWord(word.value),
      explanation: `Sample usage: The word "${word.value}" can be used to express ${word.meaning}`
    };
  }

  /**
   * Get difficulty level for a word from the definitions database
   */
  private getDifficultyForWord(word: string): string {
    // This would normally come from the definitions database
    // For now, we'll use a simple heuristic
    if (word.length <= 4) return 'beginner';
    if (word.length <= 8) return 'intermediate';
    return 'advanced';
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Validate user answer against correct answer
   */
  validateAnswer(userAnswer: string, correctAnswer: string, exercise: Exercise): {
    isCorrect: boolean;
    explanation: string;
    feedback: string;
  } {
    const isCorrect = this.normalizeAnswer(userAnswer) === this.normalizeAnswer(correctAnswer);
    
    return {
      isCorrect,
      explanation: exercise.explanation || `The correct answer is: ${correctAnswer}`,
      feedback: isCorrect 
        ? `Correct! "${exercise.word}" ${exercise.explanation || correctAnswer}` 
        : `Incorrect. The right answer is: ${correctAnswer}`
    };
  }

  /**
   * Normalize answer for comparison (trim, lowercase, etc.)
   */
  private normalizeAnswer(answer: string): string {
    return answer.trim().toLowerCase();
  }

  /**
   * Generate quiz questions (similar to exercises but for assessment)
   */
  async generateQuizQuestions(
    words: Array<{id: string, value: string, meaning: string}>,
    context: string,
    baseLanguage: string,
    targetLanguage: string,
    questionCount: number = 10
  ): Promise<Exercise[]> {
    // For quiz, we'll focus on multiple choice questions
    const exercises: Exercise[] = [];
    const shuffledWords = this.shuffleArray(words);
    const selectedWords = shuffledWords.slice(0, questionCount);
    
    await manualDataService.loadAllData();
    
    for (const word of selectedWords) {
      const exercise = this.generateMultipleChoice(word, context);
      exercises.push(exercise);
    }
    
    return exercises;
  }

  /**
   * Get exercise generation statistics for admin panel
   */
  async getGenerationStats(): Promise<any> {
    await manualDataService.loadAllData();
    
    const allWords = manualDataService.getAllWords();
    const contexts = manualDataService.getAvailableContexts();
    
    // Calculate coverage statistics
    const templateCoverage: Record<string, number> = {};
    let totalWordsWithDefinitions = 0;
    let totalWordsWithDistractors = 0;
    
    for (const word of allWords) {
      const definition = manualDataService.getDefinition(word);
      if (definition && !definition.includes('Definition not found')) {
        totalWordsWithDefinitions++;
      }
      
      const distractors = manualDataService.getDistractors(word);
      if (distractors.length >= 3) {
        totalWordsWithDistractors++;
      }
    }
    
    // Calculate context coverage
    for (const context of contexts) {
      const wordsInContext = allWords.filter(word => {
        const contextualDef = manualDataService.getDefinition(word, context);
        return contextualDef && !contextualDef.includes('Definition not found');
      });
      templateCoverage[context] = wordsInContext.length;
    }
    
    return {
      totalWords: allWords.length,
      wordsWithDefinitions: totalWordsWithDefinitions,
      wordsWithDistractors: totalWordsWithDistractors,
      definitionCoverage: Math.round((totalWordsWithDefinitions / allWords.length) * 100),
      distractorCoverage: Math.round((totalWordsWithDistractors / allWords.length) * 100),
      templateCoverage,
      availableContexts: contexts,
      exerciseTypes: ['multiple_choice', 'fill_blank', 'true_false', 'matching', 'sentence_completion'],
      generationCapability: {
        canGenerateMultipleChoice: totalWordsWithDistractors > 0,
        canGenerateFillBlank: totalWordsWithDefinitions > 0,
        canGenerateTrueFalse: totalWordsWithDefinitions > 0,
        canGenerateMatching: totalWordsWithDefinitions >= 4,
        canGenerateSentenceCompletion: totalWordsWithDefinitions > 0
      }
    };
  }
}

// Export singleton instance
export const exerciseTemplateService = new ExerciseTemplateService();