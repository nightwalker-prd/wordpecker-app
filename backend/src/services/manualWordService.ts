import { manualDataService } from './manualDataService';
import { sentenceService } from './sentenceService';
import { SentenceExample } from './manualDataService';

export interface ValidationResult {
  isCorrect: boolean;
  explanation: string;
  feedback: string;
}

export interface SimilarWordsResult {
  similar_words: Array<{
    word: string;
    meaning: string;
    similarity_score: number;
    usage_note: string;
  }>;
}

export interface ReadingResult {
  title: string;
  content: string;
  word_count: number;
  reading_time_minutes: number;
  highlighted_words: Array<{
    word: string;
    definition: string;
    position: number;
  }>;
  list_name: string;
  list_context?: string;
  level: string;
  words_included: number;
  total_words_in_list: number;
}

export class ManualWordService {
  constructor() {
    // Ensure data is loaded
    manualDataService.loadAllData().catch(console.error);
  }

  /**
   * Get definition for a word with context awareness
   */
  async generateDefinition(
    word: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<string> {
    await manualDataService.loadAllData();
    return manualDataService.getDefinition(word, context);
  }

  /**
   * Validate user answer against correct answer
   */
  async validateAnswer(
    userAnswer: string, 
    correctAnswer: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<ValidationResult> {
    // Normalize answers for comparison
    const normalizeAnswer = (answer: string) => 
      answer.trim().toLowerCase().replace(/[^\w\s]/g, '');
    
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);
    
    const isExactMatch = normalizedUser === normalizedCorrect;
    
    // Check for partial matches or common variations
    const isPartialMatch = normalizedUser.includes(normalizedCorrect) || 
                          normalizedCorrect.includes(normalizedUser);
    
    const isCorrect = isExactMatch || (isPartialMatch && normalizedUser.length > normalizedCorrect.length * 0.7);
    
    let explanation: string;
    let feedback: string;
    
    if (isCorrect) {
      explanation = `Correct! "${correctAnswer}" is the right answer.`;
      feedback = `Well done! Your answer "${userAnswer}" is correct.`;
    } else if (isPartialMatch) {
      explanation = `Close, but not quite right. The correct answer is "${correctAnswer}".`;
      feedback = `You're on the right track with "${userAnswer}", but the exact answer is "${correctAnswer}".`;
    } else {
      explanation = `Incorrect. The correct answer is "${correctAnswer}".`;
      feedback = `Not quite. Your answer "${userAnswer}" doesn't match "${correctAnswer}". Try again!`;
    }
    
    return {
      isCorrect,
      explanation,
      feedback
    };
  }

  /**
   * Get example sentences for a word
   */
  async generateExamples(
    word: string, 
    meaning: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<SentenceExample[]> {
    await manualDataService.loadAllData();
    
    const sentences = await sentenceService.getSentenceExamples(word, {
      context,
      limit: 5,
      includeTranslations: true
    });
    
    // If no sentences found, create a basic example
    if (sentences.length === 0) {
      return [{
        sentence: `Here is an example using "${word}": This demonstrates the meaning of ${word}.`,
        translation: `Aquí hay un ejemplo usando "${word}": Esto demuestra el significado de ${word}.`,
        context: context || 'general',
        difficulty: 'beginner',
        context_note: `Basic example for the word "${word}" meaning: ${meaning}`
      }];
    }
    
    return sentences;
  }

  /**
   * Get similar words and synonyms
   */
  async generateSimilarWords(
    word: string, 
    meaning: string, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string
  ): Promise<SimilarWordsResult> {
    await manualDataService.loadAllData();
    
    const similarWords = manualDataService.getSimilarWords(word);
    
    // If no similar words found, return an empty result with a helpful message
    if (similarWords.length === 0) {
      console.log(`No similar words found for "${word}" in manual data`);
      return {
        similar_words: []
      };
    }
    
    return {
      similar_words: similarWords
    };
  }

  /**
   * Generate light reading passage using vocabulary words
   */
  async generateLightReading(
    words: Array<{value: string, meaning: string}>, 
    context: string, 
    baseLanguage: string, 
    targetLanguage: string,
    level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<ReadingResult> {
    await manualDataService.loadAllData();
    
    const readingPassage = await sentenceService.generateReadingPassage(
      words, 
      context, 
      level
    );
    
    return {
      title: readingPassage.title,
      content: readingPassage.content,
      word_count: readingPassage.word_count,
      reading_time_minutes: readingPassage.reading_time_minutes,
      highlighted_words: readingPassage.highlighted_words,
      list_name: `${context} Vocabulary`,
      list_context: context,
      level: readingPassage.difficulty,
      words_included: readingPassage.highlighted_words.length,
      total_words_in_list: words.length
    };
  }

  /**
   * Check if a word exists in the manual database
   */
  async hasWord(word: string): Promise<boolean> {
    await manualDataService.loadAllData();
    return manualDataService.hasWord(word);
  }

  /**
   * Get all available words
   */
  async getAllWords(): Promise<string[]> {
    await manualDataService.loadAllData();
    return manualDataService.getAllWords();
  }

  /**
   * Add a new word definition
   */
  async addWordDefinition(
    word: string,
    definition: string,
    context: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    partOfSpeech: string
  ): Promise<void> {
    await manualDataService.loadAllData();
    
    await manualDataService.addDefinition({
      word,
      general: definition,
      contextual: { [context]: definition },
      difficulty,
      part_of_speech: partOfSpeech,
      pronunciation: '',
      audio_file: `${word}.mp3`
    });
  }
}

export const manualWordService = new ManualWordService();