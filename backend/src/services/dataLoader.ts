import { manualDataService } from './manualDataService';
import { exerciseTemplateService } from './exerciseTemplateService';
import { sentenceService } from './sentenceService';

export interface DataLoadStats {
  definitionsLoaded: number;
  sentencesLoaded: number;
  exerciseTemplatesLoaded: number;
  similarWordsLoaded: number;
  distractorsLoaded: number;
  loadTime: number;
  errors: string[];
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalWords: number;
    wordsWithSentences: number;
    wordsWithSimilar: number;
    wordsWithDistractions: number;
    contextsFound: string[];
  };
}

export class DataLoader {
  private isLoaded: boolean = false;
  private loadStats: DataLoadStats | null = null;
  
  /**
   * Load all manual data and initialize services
   */
  async loadAllData(): Promise<DataLoadStats> {
    const startTime = Date.now();
    console.log('🚀 Starting manual data loading...');
    
    const stats: DataLoadStats = {
      definitionsLoaded: 0,
      sentencesLoaded: 0,
      exerciseTemplatesLoaded: 0,
      similarWordsLoaded: 0,
      distractorsLoaded: 0,
      loadTime: 0,
      errors: []
    };
    
    try {
      // Load core manual data service
      await manualDataService.loadAllData();
      console.log('✅ Manual data service loaded');
      
      // Get statistics
      stats.definitionsLoaded = manualDataService.getAllWords().length;
      stats.sentencesLoaded = await this.countSentences();
      stats.similarWordsLoaded = await this.countSimilarWords();
      stats.distractorsLoaded = await this.countDistractors();
      
      // Validate data integrity
      const validation = await this.validateDataIntegrity();
      if (!validation.isValid) {
        stats.errors.push(...validation.errors);
        console.warn('⚠️ Data validation found issues:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Data validation warnings:', validation.warnings);
      }
      
      const endTime = Date.now();
      stats.loadTime = endTime - startTime;
      this.loadStats = stats;
      this.isLoaded = true;
      
      console.log('🎉 Manual data loading completed successfully!');
      console.log(`📊 Statistics:
        - Definitions: ${stats.definitionsLoaded}
        - Sentences: ${stats.sentencesLoaded}
        - Similar words: ${stats.similarWordsLoaded}
        - Distractors: ${stats.distractorsLoaded}
        - Load time: ${stats.loadTime}ms
      `);
      
      return stats;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      stats.errors.push(`Failed to load manual data: ${errorMessage}`);
      console.error('❌ Failed to load manual data:', error);
      throw error;
    }
  }
  
  /**
   * Check if data is loaded
   */
  isDataLoaded(): boolean {
    return this.isLoaded;
  }
  
  /**
   * Get load statistics
   */
  getLoadStats(): DataLoadStats | null {
    return this.loadStats;
  }
  
  /**
   * Reload all data (useful for admin interface)
   */
  async reloadData(): Promise<DataLoadStats> {
    this.isLoaded = false;
    this.loadStats = null;
    return await this.loadAllData();
  }
  
  /**
   * Validate data integrity and consistency
   */
  async validateDataIntegrity(): Promise<DataValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get all words from definitions
    const allWords = manualDataService.getAllWords();
    let wordsWithSentences = 0;
    let wordsWithSimilar = 0;
    let wordsWithDistractions = 0;
    const contextsFound = new Set<string>();
    
    for (const word of allWords) {
      // Check if word has sentences
      const sentences = manualDataService.getSentenceExamples(word);
      if (sentences.length > 0) {
        wordsWithSentences++;
        // Collect contexts
        sentences.forEach(s => contextsFound.add(s.context));
      } else {
        warnings.push(`Word "${word}" has no example sentences`);
      }
      
      // Check if word has similar words
      const similar = manualDataService.getSimilarWords(word);
      if (similar.length > 0) {
        wordsWithSimilar++;
      }
      
      // Check if word has distractors
      const distractors = manualDataService.getDistractors(word);
      if (distractors.length >= 3) {
        wordsWithDistractions++;
      } else {
        warnings.push(`Word "${word}" has insufficient distractors (${distractors.length}/3)`);
      }
      
      // Validate definition exists
      const definition = manualDataService.getDefinition(word);
      if (definition.includes('Definition not found')) {
        errors.push(`No definition found for word "${word}"`);
      }
    }
    
    // Check for orphaned sentences (sentences for words not in definitions)
    await this.validateOrphanedSentences(allWords, errors, warnings);
    
    // Check exercise template coverage
    await this.validateExerciseTemplates(Array.from(contextsFound), warnings);
    
    const isValid = errors.length === 0;
    
    return {
      isValid,
      errors,
      warnings,
      stats: {
        totalWords: allWords.length,
        wordsWithSentences,
        wordsWithSimilar,
        wordsWithDistractions,
        contextsFound: Array.from(contextsFound).sort()
      }
    };
  }
  
  /**
   * Get health status of the data system
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details: any;
  } {
    if (!this.isLoaded) {
      return {
        status: 'error',
        message: 'Data not loaded',
        details: { loaded: false }
      };
    }
    
    if (!this.loadStats) {
      return {
        status: 'warning',
        message: 'Load stats unavailable',
        details: { loaded: true, stats: null }
      };
    }
    
    if (this.loadStats.errors.length > 0) {
      return {
        status: 'error',
        message: 'Data loaded with errors',
        details: {
          loaded: true,
          errors: this.loadStats.errors,
          stats: this.loadStats
        }
      };
    }
    
    return {
      status: 'healthy',
      message: 'All data loaded successfully',
      details: {
        loaded: true,
        stats: this.loadStats
      }
    };
  }
  
  /**
   * Initialize data loading with retry logic
   */
  async initializeWithRetry(maxRetries: number = 3): Promise<DataLoadStats> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📂 Data loading attempt ${attempt}/${maxRetries}`);
        return await this.loadAllData();
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to load data after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }
  
  // Private helper methods
  
  private async countSentences(): Promise<number> {
    const allWords = manualDataService.getAllWords();
    let totalSentences = 0;
    
    for (const word of allWords) {
      const sentences = manualDataService.getSentenceExamples(word);
      totalSentences += sentences.length;
    }
    
    return totalSentences;
  }
  
  private async countSimilarWords(): Promise<number> {
    const allWords = manualDataService.getAllWords();
    let totalSimilar = 0;
    
    for (const word of allWords) {
      const similar = manualDataService.getSimilarWords(word);
      totalSimilar += similar.length;
    }
    
    return totalSimilar;
  }
  
  private async countDistractors(): Promise<number> {
    const allWords = manualDataService.getAllWords();
    let totalDistractors = 0;
    
    for (const word of allWords) {
      const distractors = manualDataService.getDistractors(word);
      totalDistractors += distractors.length;
    }
    
    return totalDistractors;
  }
  
  private async validateOrphanedSentences(
    validWords: string[], 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    // This would require checking sentence files against word definitions
    // For now, we'll skip this validation as it would require file system access
    // In a real implementation, you'd iterate through sentence files and check
    // if corresponding words exist in definitions
  }
  
  private async validateExerciseTemplates(
    contexts: string[], 
    warnings: string[]
  ): Promise<void> {
    // Check if we have exercise templates for all contexts
    // This is a placeholder - real implementation would check template files
    const knownTemplates = ['business', 'daily', 'technology', 'sports'];
    
    for (const context of contexts) {
      if (!knownTemplates.includes(context)) {
        warnings.push(`No exercise templates found for context "${context}"`);
      }
    }
  }
}

// Export singleton instance
export const dataLoader = new DataLoader();