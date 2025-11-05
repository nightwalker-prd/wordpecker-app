import { Router, Request, Response } from 'express';
import { manualDataService } from '../../services/manualDataService';
import { dataLoader } from '../../services/dataLoader';
import { exerciseTemplateService } from '../../services/exerciseTemplateService';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Middleware to check if we're in manual mode
const requireManualMode = (req: Request, res: Response, next: Function) => {
  if (process.env.MANUAL_DATA_MODE !== 'true') {
    return res.status(403).json({ 
      error: 'Admin panel only available in manual data mode' 
    });
  }
  next();
};

// Apply manual mode check to all admin routes
router.use(requireManualMode);

/**
 * System Health and Status
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = dataLoader.getHealthStatus();
    const stats = manualDataService.getStats();
    
    res.json({
      status: healthStatus.status,
      message: healthStatus.message,
      details: healthStatus.details,
      statistics: {
        totalWords: stats.totalWords,
        totalDefinitions: stats.totalDefinitions,
        totalSentences: stats.totalSentences,
        totalContexts: stats.availableContexts.length,
        availableContexts: stats.availableContexts
      },
      dataLoaded: !!healthStatus.details?.loaded,
      lastLoadTime: healthStatus.details?.stats?.loadTime
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get system health',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Reload all manual data
 */
router.post('/reload-data', async (req, res) => {
  try {
    console.log('🔄 Admin triggered data reload');
    const stats = await dataLoader.initializeWithRetry(3);
    
    res.json({
      message: 'Data reloaded successfully',
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Data reload failed:', error);
    res.status(500).json({ 
      error: 'Failed to reload data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Word Definitions Management
 */

// Get all definitions
router.get('/definitions', async (req, res) => {
  try {
    const { context, search, difficulty } = req.query;
    const allWords = manualDataService.getAllWords();
    
    let definitions = allWords.map(word => {
      const definition = manualDataService.getDefinition(word);
      const contextualDefs = manualDataService.getContextualDefinitions(word);
      
      return {
        word,
        general: definition,
        contextual: contextualDefs,
        difficulty: manualDataService.getWordDifficulty(word),
        part_of_speech: manualDataService.getPartOfSpeech(word) || 'noun'
      };
    }).filter(def => def.general && !def.general.includes('Definition not found'));

    // Apply filters
    if (context && context !== 'all') {
      definitions = definitions.filter(def => 
        def.contextual && def.contextual[context as string]
      );
    }
    
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      definitions = definitions.filter(def => 
        def.word.toLowerCase().includes(searchTerm) ||
        def.general.toLowerCase().includes(searchTerm)
      );
    }
    
    if (difficulty) {
      definitions = definitions.filter(def => def.difficulty === difficulty);
    }

    res.json({
      definitions,
      total: definitions.length,
      availableContexts: manualDataService.getAvailableContexts()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get definitions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add new definition
router.post('/definitions', async (req, res) => {
  try {
    const { word, general, contextual, difficulty, part_of_speech } = req.body;
    
    if (!word || !general) {
      return res.status(400).json({ 
        error: 'Word and general definition are required' 
      });
    }

    // Check if word already exists
    const existingDef = manualDataService.getDefinition(word);
    if (existingDef && !existingDef.includes('Definition not found')) {
      return res.status(409).json({ 
        error: 'Word already exists. Use PUT to update.' 
      });
    }

    // Add the definition to the data service
    await manualDataService.addAdminDefinition(word, {
      general,
      contextual: contextual || {},
      difficulty: difficulty || 'intermediate',
      part_of_speech: part_of_speech || 'noun'
    });

    res.status(201).json({
      message: 'Definition added successfully',
      word,
      definition: {
        general,
        contextual,
        difficulty,
        part_of_speech
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to add definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update existing definition
router.put('/definitions/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const { general, contextual, difficulty, part_of_speech } = req.body;
    
    if (!general) {
      return res.status(400).json({ 
        error: 'General definition is required' 
      });
    }

    // Update the definition in the data service
    await manualDataService.updateDefinition(word, {
      general,
      contextual: contextual || {},
      difficulty: difficulty || 'intermediate',
      part_of_speech: part_of_speech || 'noun'
    });

    res.json({
      message: 'Definition updated successfully',
      word,
      definition: {
        general,
        contextual,
        difficulty,
        part_of_speech
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete definition
router.delete('/definitions/:word', async (req, res) => {
  try {
    const { word } = req.params;
    
    // Remove the definition from the data service
    await manualDataService.removeDefinition(word);

    res.json({
      message: 'Definition deleted successfully',
      word
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Sentence Examples Management
 */

// Get sentence examples for a word
router.get('/sentences/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const sentences = manualDataService.getSentenceExamples(word);
    
    res.json({
      word,
      sentences,
      count: sentences.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get sentences',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add sentence example
router.post('/sentences/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const { sentence, translation, context, difficulty } = req.body;
    
    if (!sentence) {
      return res.status(400).json({ 
        error: 'Sentence is required' 
      });
    }

    await manualDataService.addSentenceExample(word, {
      sentence,
      translation: translation || '',
      context: context || 'general',
      difficulty: difficulty || 'intermediate'
    });

    res.status(201).json({
      message: 'Sentence example added successfully',
      word,
      sentence: {
        sentence,
        translation,
        context,
        difficulty
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to add sentence example',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Exercise Templates Management
 */

// Get exercise generation statistics
router.get('/exercises/stats', async (req, res) => {
  try {
    const stats = await exerciseTemplateService.getGenerationStats();
    
    res.json({
      statistics: stats,
      availableTypes: ['multiple_choice', 'fill_blank', 'true_false', 'matching', 'sentence_completion'],
      templateCoverage: stats.templateCoverage || {}
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get exercise statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Data Import/Export
 */

// Export all data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        totalWords: manualDataService.getAllWords().length
      },
      definitions: manualDataService.getAllDefinitionsData(),
      sentences: manualDataService.getAllSentencesData(),
      statistics: manualDataService.getStats()
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="wordpecker-data.json"');
      res.json(exportData);
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to export data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import data
router.post('/import', async (req, res) => {
  try {
    const { data, overwrite = false } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Import data is required' });
    }

    const importResult = await manualDataService.importData(data, { overwrite });
    
    // Reload data after import
    await dataLoader.initializeWithRetry(3);

    res.json({
      message: 'Data imported successfully',
      result: importResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to import data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * System Configuration
 */

// Get system configuration
router.get('/config', async (req, res) => {
  try {
    const config = {
      mode: 'manual',
      dataPath: path.resolve(__dirname, '../../data'),
      features: {
        admin_panel: true,
        llm_features: false,
        data_validation: true,
        auto_backup: false
      },
      limits: {
        max_definitions_per_word: 10,
        max_sentences_per_word: 20,
        max_contexts: 20
      },
      environment: {
        node_env: process.env.NODE_ENV,
        manual_data_mode: process.env.MANUAL_DATA_MODE
      }
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;