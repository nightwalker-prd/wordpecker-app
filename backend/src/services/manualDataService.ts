import fs from 'fs';
import path from 'path';

export interface Definition {
  word: string;
  general: string;
  contextual: Record<string, string>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  part_of_speech: string;
  pronunciation?: string;
  audio_file?: string;
}

export interface SentenceExample {
  sentence: string;
  translation: string | null;
  context: string;
  difficulty: string;
  audio_file?: string;
  context_note?: string;
}

export interface ExerciseTemplate {
  type: 'multiple_choice' | 'fill_in_blank' | 'matching' | 'true_false' | 'sentence_completion';
  question_template: string;
  distractors: string[];
  context: string;
  difficulty: string;
}

export interface SimilarWord {
  word: string;
  meaning: string;
  similarity_score: number;
  usage_note: string;
}

export class ManualDataService {
  private definitionsDB: Map<string, Definition> = new Map();
  private sentencesDB: Map<string, SentenceExample[]> = new Map();
  private exerciseTemplatesDB: Map<string, ExerciseTemplate[]> = new Map();
  private similarWordsDB: Map<string, SimilarWord[]> = new Map();
  private distractorsDB: Map<string, string[]> = new Map();
  private dataPath: string;
  private isLoaded: boolean = false;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'src', 'data');
  }

  /**
   * Load all data from JSON files into memory
   */
  async loadAllData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      await Promise.all([
        this.loadDefinitions(),
        this.loadSentences(),
        this.loadExerciseTemplates(),
        this.loadSimilarWords(),
        this.loadDistractors()
      ]);
      this.isLoaded = true;
      console.log('✅ Manual data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load manual data:', error);
      throw error;
    }
  }

  /**
   * Get definition for a word with optional context
   */
  getDefinition(word: string, context?: string): string {
    const definition = this.definitionsDB.get(word.toLowerCase());
    if (!definition) {
      return `Definition not found for "${word}". Please add it to the definitions database.`;
    }

    // Return contextual definition if available and context provided
    if (context && definition.contextual[context.toLowerCase()]) {
      return definition.contextual[context.toLowerCase()];
    }

    // Fall back to general definition
    return definition.general;
  }

  /**
   * Get example sentences for a word
   */
  getSentenceExamples(word: string, context?: string): SentenceExample[] {
    const sentences = this.sentencesDB.get(word.toLowerCase()) || [];
    
    // Filter by context if provided
    if (context) {
      return sentences.filter(s => s.context.toLowerCase() === context.toLowerCase());
    }
    
    return sentences;
  }

  /**
   * Get similar words for a given word
   */
  getSimilarWords(word: string): SimilarWord[] {
    return this.similarWordsDB.get(word.toLowerCase()) || [];
  }

  /**
   * Get distractors for multiple choice questions
   */
  getDistractors(word: string, context?: string): string[] {
    const contextKey = context ? `${context.toLowerCase()}_${word.toLowerCase()}` : word.toLowerCase();
    const specificDistractors = this.distractorsDB.get(contextKey);
    
    if (specificDistractors && specificDistractors.length >= 3) {
      return specificDistractors.slice(0, 3);
    }

    // Fall back to general distractors for the word
    const generalDistractors = this.distractorsDB.get(word.toLowerCase()) || [];
    
    if (generalDistractors.length >= 3) {
      return generalDistractors.slice(0, 3);
    }

    // Generate basic distractors if none exist
    return this.generateBasicDistractors(word);
  }

  /**
   * Check if a word exists in the database
   */
  hasWord(word: string): boolean {
    return this.definitionsDB.has(word.toLowerCase());
  }

  /**
   * Get all words in the database
   */
  getAllWords(): string[] {
    return Array.from(this.definitionsDB.keys());
  }

  /**
   * Add a new word definition
   */
  async addDefinition(definition: Definition): Promise<void> {
    this.definitionsDB.set(definition.word.toLowerCase(), definition);
    await this.saveDefinitionsToFile();
  }

  /**
   * Add example sentences for a word
   */
  async addSentenceExamples(word: string, sentences: SentenceExample[]): Promise<void> {
    const existing = this.sentencesDB.get(word.toLowerCase()) || [];
    this.sentencesDB.set(word.toLowerCase(), [...existing, ...sentences]);
    await this.saveSentencesToFile(word);
  }

  // Private methods for loading data

  private async loadDefinitions(): Promise<void> {
    const definitionsPath = path.join(this.dataPath, 'definitions');
    
    if (!fs.existsSync(definitionsPath)) {
      console.log('Creating definitions directory...');
      fs.mkdirSync(definitionsPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(definitionsPath).filter((f: string) => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(definitionsPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (Array.isArray(data)) {
        data.forEach((def: Definition) => {
          this.definitionsDB.set(def.word.toLowerCase(), def);
        });
      }
    }
  }

  private async loadSentences(): Promise<void> {
    const sentencesPath = path.join(this.dataPath, 'sentences');
    
    if (!fs.existsSync(sentencesPath)) {
      console.log('Creating sentences directory...');
      fs.mkdirSync(sentencesPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(sentencesPath).filter((f: string) => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(sentencesPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const word = path.basename(file, '.json');
      
      if (Array.isArray(data)) {
        this.sentencesDB.set(word.toLowerCase(), data);
      }
    }
  }

  private async loadExerciseTemplates(): Promise<void> {
    const templatesPath = path.join(this.dataPath, 'exercises', 'templates');
    
    if (!fs.existsSync(templatesPath)) {
      console.log('Creating exercise templates directory...');
      fs.mkdirSync(templatesPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(templatesPath).filter((f: string) => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(templatesPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const context = path.basename(file, '.json');
      
      if (Array.isArray(data)) {
        this.exerciseTemplatesDB.set(context.toLowerCase(), data);
      }
    }
  }

  private async loadSimilarWords(): Promise<void> {
    const similarWordsPath = path.join(this.dataPath, 'similar-words');
    
    if (!fs.existsSync(similarWordsPath)) {
      console.log('Creating similar words directory...');
      fs.mkdirSync(similarWordsPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(similarWordsPath).filter((f: string) => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(similarWordsPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const word = path.basename(file, '.json');
      
      if (Array.isArray(data)) {
        this.similarWordsDB.set(word.toLowerCase(), data);
      }
    }
  }

  private async loadDistractors(): Promise<void> {
    const distractorsPath = path.join(this.dataPath, 'exercises', 'distractors');
    
    if (!fs.existsSync(distractorsPath)) {
      console.log('Creating distractors directory...');
      fs.mkdirSync(distractorsPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(distractorsPath).filter((f: string) => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(distractorsPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const key = path.basename(file, '.json');
      
      if (Array.isArray(data)) {
        this.distractorsDB.set(key.toLowerCase(), data);
      }
    }
  }

  private generateBasicDistractors(word: string): string[] {
    // Basic fallback distractors - in production, these should be manually curated
    return [
      'incorrect definition A',
      'incorrect definition B', 
      'incorrect definition C'
    ];
  }

  private async saveDefinitionsToFile(): Promise<void> {
    const definitionsPath = path.join(this.dataPath, 'definitions');
    fs.mkdirSync(definitionsPath, { recursive: true });
    
    const definitions = Array.from(this.definitionsDB.values());
    const filePath = path.join(definitionsPath, 'manual_entries.json');
    
    fs.writeFileSync(filePath, JSON.stringify(definitions, null, 2));
  }

  private async saveSentencesToFile(word: string): Promise<void> {
    const sentencesPath = path.join(this.dataPath, 'sentences');
    fs.mkdirSync(sentencesPath, { recursive: true });
    
    const sentences = this.sentencesDB.get(word.toLowerCase());
    if (sentences) {
      const filePath = path.join(sentencesPath, `${word.toLowerCase()}.json`);
      fs.writeFileSync(filePath, JSON.stringify(sentences, null, 2));
    }
  }

  /**
   * Admin-specific methods for UI management
   */

  /**
   * Get comprehensive statistics about the data
   */
  getStats() {
    return {
      totalWords: this.definitionsDB.size,
      totalDefinitions: this.definitionsDB.size,
      totalSentences: Array.from(this.sentencesDB.values()).reduce((sum, sentences) => sum + sentences.length, 0),
      totalSimilarWords: Array.from(this.similarWordsDB.values()).reduce((sum, words) => sum + words.length, 0),
      totalDistractors: Array.from(this.distractorsDB.values()).reduce((sum, distractors) => sum + distractors.length, 0),
      availableContexts: this.getAvailableContexts(),
      difficultyDistribution: this.getDifficultyDistribution(),
      partOfSpeechDistribution: this.getPartOfSpeechDistribution()
    };
  }

  /**
   * Get contextual definitions for a word
   */
  getContextualDefinitions(word: string): Record<string, string> {
    const definition = this.definitionsDB.get(word.toLowerCase());
    return definition?.contextual || {};
  }

  /**
   * Get word difficulty
   */
  getWordDifficulty(word: string): string {
    const definition = this.definitionsDB.get(word.toLowerCase());
    return definition?.difficulty || 'intermediate';
  }

  /**
   * Get part of speech for a word
   */
  getPartOfSpeech(word: string): string {
    const definition = this.definitionsDB.get(word.toLowerCase());
    return definition?.part_of_speech || 'noun';
  }

  /**
   * Get available contexts
   */
  getAvailableContexts(): string[] {
    const contexts = new Set<string>();
    
    // From definitions
    this.definitionsDB.forEach(def => {
      Object.keys(def.contextual || {}).forEach(context => contexts.add(context));
    });
    
    // From sentences
    this.sentencesDB.forEach(sentences => {
      sentences.forEach(sentence => contexts.add(sentence.context));
    });
    
    return Array.from(contexts).sort();
  }

  /**
   * Add a new definition (admin version with detailed data)
   */
  async addAdminDefinition(word: string, definitionData: {
    general: string;
    contextual?: Record<string, string>;
    difficulty?: string;
    part_of_speech?: string;
  }): Promise<void> {
    const definition: Definition = {
      word: word.toLowerCase(),
      general: definitionData.general,
      contextual: definitionData.contextual || {},
      difficulty: (definitionData.difficulty as any) || 'intermediate',
      part_of_speech: definitionData.part_of_speech || 'noun'
    };

    this.definitionsDB.set(word.toLowerCase(), definition);
    
    // Persist to file
    await this.saveDefinitionToFile(definition);
  }

  /**
   * Update an existing definition
   */
  async updateDefinition(word: string, definitionData: {
    general: string;
    contextual?: Record<string, string>;
    difficulty?: string;
    part_of_speech?: string;
  }): Promise<void> {
    const existing = this.definitionsDB.get(word.toLowerCase());
    if (!existing) {
      throw new Error(`Definition for "${word}" not found`);
    }

    const updated: Definition = {
      ...existing,
      general: definitionData.general,
      contextual: definitionData.contextual || existing.contextual,
      difficulty: (definitionData.difficulty as any) || existing.difficulty,
      part_of_speech: definitionData.part_of_speech || existing.part_of_speech
    };

    this.definitionsDB.set(word.toLowerCase(), updated);
    
    // Persist to file
    await this.saveDefinitionToFile(updated);
  }

  /**
   * Remove a definition
   */
  async removeDefinition(word: string): Promise<void> {
    this.definitionsDB.delete(word.toLowerCase());
    
    // Remove from file system if needed
    // This would require implementing file deletion logic
  }

  /**
   * Add a sentence example
   */
  async addSentenceExample(word: string, sentenceData: {
    sentence: string;
    translation?: string;
    context?: string;
    difficulty?: string;
  }): Promise<void> {
    const sentence: SentenceExample = {
      sentence: sentenceData.sentence,
      translation: sentenceData.translation || null,
      context: sentenceData.context || 'general',
      difficulty: sentenceData.difficulty || 'intermediate'
    };

    const existing = this.sentencesDB.get(word.toLowerCase()) || [];
    existing.push(sentence);
    this.sentencesDB.set(word.toLowerCase(), existing);
    
    // Persist to file
    await this.saveSentencesToFile(word);
  }

  /**
   * Get all definitions data for export
   */
  getAllDefinitionsData(): Definition[] {
    return Array.from(this.definitionsDB.values());
  }

  /**
   * Get all sentences data for export
   */
  getAllSentencesData(): Record<string, SentenceExample[]> {
    const result: Record<string, SentenceExample[]> = {};
    this.sentencesDB.forEach((sentences, word) => {
      result[word] = sentences;
    });
    return result;
  }

  /**
   * Import data from external source
   */
  async importData(data: any, options: { overwrite?: boolean } = {}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Import definitions
      if (data.definitions && Array.isArray(data.definitions)) {
        for (const def of data.definitions) {
          try {
            const exists = this.definitionsDB.has(def.word.toLowerCase());
            
            if (exists && !options.overwrite) {
              result.skipped++;
              continue;
            }

            await this.addAdminDefinition(def.word, {
              general: def.general,
              contextual: def.contextual,
              difficulty: def.difficulty,
              part_of_speech: def.part_of_speech
            });
            
            result.imported++;
          } catch (error) {
            result.errors.push(`Failed to import definition for "${def.word}": ${error}`);
          }
        }
      }

      // Import sentences
      if (data.sentences && typeof data.sentences === 'object') {
        for (const [word, sentences] of Object.entries(data.sentences)) {
          try {
            if (Array.isArray(sentences)) {
              for (const sentence of sentences) {
                await this.addSentenceExample(word, sentence as any);
              }
            }
          } catch (error) {
            result.errors.push(`Failed to import sentences for "${word}": ${error}`);
          }
        }
      }

    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
    }

    return result;
  }

  /**
   * Get difficulty distribution
   */
  private getDifficultyDistribution() {
    const distribution = { beginner: 0, intermediate: 0, advanced: 0 };
    this.definitionsDB.forEach(def => {
      if (def.difficulty in distribution) {
        distribution[def.difficulty]++;
      }
    });
    return distribution;
  }

  /**
   * Get part of speech distribution
   */
  private getPartOfSpeechDistribution() {
    const distribution: Record<string, number> = {};
    this.definitionsDB.forEach(def => {
      distribution[def.part_of_speech] = (distribution[def.part_of_speech] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Save definition to file
   */
  private async saveDefinitionToFile(definition: Definition): Promise<void> {
    // This would implement file writing logic
    // For now, we'll just update the in-memory store
    console.log(`Would save definition for "${definition.word}" to file`);
  }
}
}

// Export singleton instance
export const manualDataService = new ManualDataService();