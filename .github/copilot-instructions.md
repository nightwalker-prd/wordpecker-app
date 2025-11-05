# WordPecker App - AI Coding Agent Instructions

WordPecker is a personalized language-learning app that can operate in two modes: **LLM-powered** (dynamic AI features) or **Traditional** (dictionary APIs and static content).

## Dual Architecture Options

### Option A: LLM-Powered Mode (Current)
- **Backend**: Uses `@openai/agents` SDK with specialized agents in `backend/src/agents/`
- **Agent Pattern**: Each agent has `index.ts`, `schemas.ts`, and `prompt.md` files
- **Configuration**: Global OpenAI setup in `backend/src/agents/config.ts` using `setDefaultOpenAIKey()`
- **Usage**: Agents invoked via `run(agentName, prompt)` in service classes

### Option B: Manual Data Mode (Fully Offline)
- **No External APIs**: All data manually curated and stored locally
- **JSON-Based Content**: Word definitions, examples, exercises stored in JSON files
- **Template System**: Expanded template system for all learning content
- **File-Based Management**: Admin interface for managing vocabulary data
- **Zero Dependencies**: No OpenAI, dictionary APIs, or translation services

Example agent structure (LLM mode):
```typescript
// backend/src/agents/definition-agent/index.ts
export const definitionAgent = new Agent({
  name: 'Definition Agent',
  instructions: promptContent, // loaded from prompt.md
  outputType: DefinitionResult, // Zod schema
  modelSettings: { temperature: 0.5, maxTokens: 200 }
});
```

### Multi-Language Learning Architecture
- **Language Flow**: Base language (user's native) → Target language (learning)
- **Context-Aware**: Words get meanings based on list context (`listContext` field)
- **User Identification**: localStorage-based (`wordpecker-user-id`) - no authentication system

## Converting to Manual Data Mode

### Core Data Structure Replacements

#### 1. Word Definition System
**Replace**: `WordAgentService.generateDefinition()` using `definitionAgent`
**With**: Local JSON-based definition lookup

```typescript
// New: backend/src/services/manualDataService.ts
export class ManualDataService {
  private definitionsDB: Map<string, Definition> = new Map();
  
  async loadDefinitions() {
    // Load from backend/data/definitions/[language].json
    const definitions = await import('../data/definitions/english.json');
    definitions.forEach(def => this.definitionsDB.set(def.word, def));
  }
  
  getDefinition(word: string, context?: string): string {
    const definition = this.definitionsDB.get(word.toLowerCase());
    return definition?.contextual[context] || definition?.general || `Definition not found for "${word}"`;
  }
}
```

#### 2. Exercise Generation System
**Replace**: `LearnAgentService.generateExercises()` using `exerciseAgent`
**With**: Pre-defined exercise templates from JSON

```typescript
// New: backend/src/services/exerciseTemplateService.ts
export class ExerciseTemplateService {
  generateMultipleChoice(word: string, correctMeaning: string, context: string): Exercise {
    const distractors = this.getDistractorsForWord(word, context);
    return {
      type: 'multiple_choice',
      question: `What does "${word}" mean in the context of ${context}?`,
      options: this.shuffleArray([correctMeaning, ...distractors]),
      correct: correctMeaning,
      word: word
    };
  }
  
  private getDistractorsForWord(word: string, context: string): string[] {
    // Load from backend/data/distractors/[context].json
    // Return 3 plausible but incorrect meanings
  }
}
```

#### 3. Example Sentences System
**Replace**: `WordAgentService.generateExamples()` using `examplesAgent`
**With**: Manually curated sentence database

```typescript
// New: backend/src/services/sentenceService.ts
export class SentenceService {
  private sentencesDB: Map<string, SentenceExample[]> = new Map();
  
  async loadSentences() {
    // Load from backend/data/sentences/[word].json
    const sentences = await import('../data/sentences/index.json');
    Object.entries(sentences).forEach(([word, examples]) => {
      this.sentencesDB.set(word, examples);
    });
  }
  
  getSentenceExamples(word: string): SentenceExample[] {
    return this.sentencesDB.get(word.toLowerCase()) || [];
  }
}
```

### Manual Data File Structure

#### Directory Organization:
```
backend/data/
├── definitions/
│   ├── english.json
│   ├── spanish.json
│   └── french.json
├── sentences/
│   ├── business/
│   ├── daily/
│   └── academic/
├── exercises/
│   ├── templates/
│   └── distractors/
├── audio/
│   ├── pronunciations/
│   └── voice-notes/
└── images/
    ├── vocabulary/
    └── contexts/
```

#### Example Definition File:
```json
// backend/data/definitions/english.json
[
  {
    "word": "bank",
    "general": "a financial institution that accepts deposits and channels money into lending activities",
    "contextual": {
      "business": "a financial institution providing commercial and investment services",
      "geography": "the land alongside or sloping down to a river or lake",
      "daily": "a place where you keep your money and can borrow money"
    },
    "difficulty": "beginner",
    "part_of_speech": "noun"
  }
]
```

#### Example Sentence File:
```json
// backend/data/sentences/bank.json
[
  {
    "sentence": "I need to go to the bank to deposit my paycheck.",
    "translation": "Necesito ir al banco para depositar mi cheque de pago.",
    "context": "daily",
    "difficulty": "beginner",
    "audio_file": "bank_daily_001.mp3"
  },
  {
    "sentence": "The investment bank helped the company go public.",
    "translation": "El banco de inversión ayudó a la empresa a salir a bolsa.",
    "context": "business", 
    "difficulty": "advanced",
    "audio_file": "bank_business_001.mp3"
  }
]
```

### Features to Remove/Modify

#### Remove Completely:
- **Voice Chat**: `frontend/src/pages/VoiceChat.tsx` and `backend/src/api/voice/`
- **Vision Garden**: `frontend/src/pages/ImageDescription.tsx` and image generation agents
- **Get New Words**: Dynamic vocabulary discovery via LLM
- **All Agent Dependencies**: Remove `@openai/agents` and related imports

#### Modify to File-Based:
- **Quiz Generation**: Load questions from JSON templates instead of dynamic generation
- **Reading Passages**: Store pre-written texts in markdown/JSON files
- **Similar Words**: Pre-computed word relationships in JSON files
- **Audio**: Store local audio files for pronunciation instead of ElevenLabs API

### Manual Content Management

#### Admin Interface for Data Entry:
```typescript
// New: frontend/src/pages/Admin.tsx
export function AdminPanel() {
  return (
    <AdminLayout>
      <WordDefinitionEditor />
      <SentenceExampleEditor />  
      <ExerciseTemplateEditor />
      <AudioFileManager />
      <ImageAssetManager />
    </AdminLayout>
  );
}
```

#### Word Definition Editor:
```typescript
// Component for manually adding/editing word definitions
export function WordDefinitionEditor() {
  const [word, setWord] = useState('');
  const [definitions, setDefinitions] = useState({
    general: '',
    contextual: {}
  });
  
  const saveDefinition = async () => {
    // Save to backend/data/definitions/[language].json
    await fetch('/api/admin/definitions', {
      method: 'POST',
      body: JSON.stringify({ word, definitions })
    });
  };
}
```

### File-Based Data Loading

#### Startup Data Loading:
```typescript
// backend/src/services/dataLoader.ts
export class DataLoader {
  async loadAllData() {
    await Promise.all([
      this.loadDefinitions(),
      this.loadSentences(), 
      this.loadExerciseTemplates(),
      this.loadAudioMappings(),
      this.loadImageMappings()
    ]);
  }
  
  private async loadDefinitions() {
    const files = await fs.readdir('./data/definitions/');
    for (const file of files) {
      const language = path.basename(file, '.json');
      const definitions = await import(`./data/definitions/${file}`);
      this.definitionsCache.set(language, definitions);
    }
  }
}
```

### External API Integrations

#### Dictionary APIs:
```bash
# Add to package.json dependencies
npm install node-fetch axios

# Environment variables
WORDNIK_API_KEY=your_key
OXFORD_API_KEY=your_key
CAMBRIDGE_API_KEY=your_key
```

#### Translation APIs:
```typescript
// For multi-language support without LLM
export class TranslationService {
  async translate(text: string, from: string, to: string): Promise<string> {
    // Use Google Translate API, Azure Translator, or similar
    return await this.googleTranslate(text, from, to);
  }
}
```

## Development Workflows

### Docker Development (Recommended)
```bash
# Use provided script for setup
./scripts/docker-dev.sh

# Or manual Docker commands
docker-compose up --build  # Full stack with hot reload
docker-compose -f docker-compose.mongo.yml up -d  # MongoDB only
```

### Local Development
```bash
# Backend
cd backend && npm run dev  # nodemon with TypeScript

# Frontend  
cd frontend && npm run dev  # Vite dev server

# Database seeding
npm run seed:templates  # Seed from JSON files in data/templates/
```

### Testing
- **Backend**: Jest with `ts-jest`, setup in `backend/src/tests/setup.ts`
- **Agent Testing**: See `backend/src/tests/test-image-agent.js` for agent testing patterns
- **Test Command**: `npm test` in backend directory

## Key Services & Integration Points

### Rate Limiting Strategy
- **Manual Mode**: Minimal rate limiting since no external API calls
- **File Operations**: Standard rate limiting on data file modifications
- **Applied to**: Admin routes for data management (`/api/admin/*`)
- **Local Audio**: File-based audio storage with optional local TTS integration

### Voice Chat System (LLM Mode Only)
- **Frontend**: `@openai/agents-realtime` for voice interactions
- **Configuration**: `VoiceAgentConfig` with list context and user languages
- **Tools**: Voice agents can add words to lists using built-in tools
- **Manual Mode Alternative**: Remove entirely or replace with simple pronunciation playback

### Image & Vision Features (LLM Mode Only)
- **Vision Garden**: Image description → vocabulary discovery workflow
- **Dual Sources**: DALL-E generation + Pexels stock photos  
- **Agents**: `imageAnalysisAgent`, `imageGenerationAgent`, `contextualImageAgent`
- **Manual Mode Alternative**: Static image galleries with manually tagged vocabulary

## File Organization Patterns

### Agent Development
- Place prompts in `prompt.md` files, not inline in code
- Use Zod schemas for structured outputs in `schemas.ts`
- Service classes invoke agents: `LearnAgentService`, `WordAgentService`, etc.

### Frontend Structure
- **Pages**: React components in `frontend/src/pages/`
- **Agent Integration**: Frontend voice agent in `frontend/src/agents/voice-agent/`
- **API Layer**: Centralized in `frontend/src/services/api.ts` with userId injection

### Environment Configuration
- **Docker**: Use `.env.docker` template, copy to `.env`
- **Manual Mode**: Remove `OPENAI_API_KEY` requirement
- **Optional Audio**: Local TTS or pre-recorded audio files
- **MongoDB**: Containerized with credentials `admin:password`

## Data Flow Patterns

### Word Learning Cycle
1. **Discovery**: Vision Garden, Get New Words, or manual entry
2. **Storage**: MongoDB with context-aware definitions
3. **Practice**: Learn mode (5 exercise types), Quiz mode, Voice chat
4. **Enhancement**: Word detail pages with examples, similar words, images

### Context Awareness
- Lists have `context` field affecting word definitions
- Examples: "Harry Potter Book" context vs "Business Vocabulary" context
- Agents consider context when generating content

## Development Conventions

### API Patterns
- **Routes**: Organized by feature in `backend/src/api/[feature]/routes.ts`
- **Services**: Agent interactions in `backend/src/api/[feature]/agent-service.ts`
- **Validation**: Express validator for request validation

### Error Handling
- **Middleware**: Centralized error handler in `backend/src/middleware/errorHandler.ts`
- **MongoDB**: Retry logic with 5 connection attempts
- **Frontend**: React Query for API state management

### MongoDB Patterns
- **Schemaless**: Mongoose with flexible document structure
- **Auto-creation**: Collections created automatically, no manual setup
- **Connection**: Retry logic in `backend/src/config/mongodb.ts`

## Key Commands & Scripts

```bash
# Database operations
npm run seed:templates        # Seed template data
npm run seed:templates:legacy # Legacy seeding approach

# Development
npm run dev                   # Start with hot reload
npm run build                 # TypeScript compilation
npm run lint                  # ESLint validation

# Docker operations
./scripts/docker-dev.sh       # Complete setup with validation
docker-compose logs -f backend # View backend logs
docker-compose down -v        # Reset including database
```

Remember: This is a single-user app with localStorage-based identification. Focus on the learning experience rather than user management when developing features.