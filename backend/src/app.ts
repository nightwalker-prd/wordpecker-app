import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { environment } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { openaiRateLimiter, defaultRateLimiter } from './middleware/rateLimiter';
import { connectDB } from './config/mongodb';
import { configureOpenAIAgents } from './agents';
import { dataLoader } from './services/dataLoader';

// Import routes
import listRoutes from './api/lists/routes';
import wordRoutes from './api/words/routes';
import learnRoutes from './api/learn/routes';
import quizRoutes from './api/quiz/routes';
import templateRoutes from './api/templates/routes';
import preferencesRoutes from './api/preferences/routes';
import imageDescriptionRoutes from './api/image-description/routes';
import vocabularyRoutes from './api/vocabulary/routes';
import languageValidationRoutes from './api/language-validation/routes';
import audioRoutes from './api/audio/routes';
import voiceRoutes from './api/voice/routes';
import adminRoutes from './api/admin/routes';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Apply rate limiter - use default for manual mode, OpenAI limiter for LLM mode
const isManualMode = process.env.MANUAL_DATA_MODE === 'true';
const rateLimiter = isManualMode ? defaultRateLimiter : openaiRateLimiter;

app.use('/api/learn', rateLimiter);
app.use('/api/quiz', rateLimiter);
if (!isManualMode) {
  app.use('/api/describe', openaiRateLimiter);
  app.use('/api/vocabulary', openaiRateLimiter);
  app.use('/api/language-validation', openaiRateLimiter);
  app.use('/api/audio', openaiRateLimiter); // Audio routes use ElevenLabs API
  app.use('/api/voice', openaiRateLimiter); // Voice routes use OpenAI Realtime API
}

// Routes
app.use('/api/lists', listRoutes);
app.use('/api/lists', wordRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/preferences', preferencesRoutes);

// Conditionally enable routes based on mode
if (!isManualMode) {
  // LLM-only features
  app.use('/api/describe', imageDescriptionRoutes);
  app.use('/api/language-validation', languageValidationRoutes);
  app.use('/api/audio', audioRoutes);
  app.use('/api/voice', voiceRoutes);
}

// Routes available in both modes (using adapters)
app.use('/api/vocabulary', vocabularyRoutes);

// Manual mode exclusive routes
if (isManualMode) {
  app.use('/api/admin', adminRoutes);
}

// Error handling
app.use(errorHandler);

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = environment.port;
  
  // Initialize services based on mode
  const initPromises: Promise<any>[] = [connectDB()];
  
  if (isManualMode) {
    console.log('🔧 Starting in Manual Data Mode');
    initPromises.push(dataLoader.initializeWithRetry(3));
  } else {
    console.log('🤖 Starting in LLM Mode');
    initPromises.push(configureOpenAIAgents());
  }
  
  Promise.all(initPromises).then(() => {
    if (isManualMode) {
      const healthStatus = dataLoader.getHealthStatus();
      console.log(`📊 Data System Health: ${healthStatus.status.toUpperCase()}`);
      console.log(`📝 ${healthStatus.message}`);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${environment.nodeEnv} mode`);
      console.log(`🔧 Mode: ${isManualMode ? 'Manual Data' : 'LLM-Powered'}`);
    });
  }).catch(error => {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  });
}

export default app; 