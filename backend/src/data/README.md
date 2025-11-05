# Manual Data Structure

This directory contains all the manually curated data for WordPecker's non-LLM mode.

## Directory Structure

```
data/
├── definitions/        # Word definitions by language
├── sentences/         # Example sentences for each word
├── similar-words/     # Similar/related words for each word
├── exercises/
│   ├── templates/     # Exercise templates by context
│   └── distractors/   # Wrong answers for multiple choice questions
├── audio/            # Audio pronunciation files
└── images/           # Visual assets for vocabulary
```

## File Formats

### Definitions (`definitions/[language].json`)
```json
[
  {
    "word": "bank",
    "general": "general definition",
    "contextual": {
      "business": "business-specific definition",
      "geography": "geography-specific definition"
    },
    "difficulty": "beginner|intermediate|advanced",
    "part_of_speech": "noun|verb|adjective|etc",
    "pronunciation": "/phonetic/",
    "audio_file": "filename.mp3"
  }
]
```

### Sentences (`sentences/[word].json`)
```json
[
  {
    "sentence": "Example sentence in target language",
    "translation": "Translation in base language", 
    "context": "context category",
    "difficulty": "beginner|intermediate|advanced",
    "audio_file": "filename.mp3",
    "context_note": "Explanation of usage"
  }
]
```

### Similar Words (`similar-words/[word].json`)
```json
[
  {
    "word": "synonym or related word",
    "meaning": "definition of the similar word",
    "similarity_score": 0.9,
    "usage_note": "explanation of similarity"
  }
]
```

### Exercise Templates (`exercises/templates/[context].json`)
```json
[
  {
    "type": "multiple_choice|fill_in_blank|matching|true_false|sentence_completion",
    "question_template": "Template with {word} and {context} placeholders",
    "distractors": ["wrong answer 1", "wrong answer 2"],
    "context": "context category",
    "difficulty": "beginner|intermediate|advanced"
  }
]
```

### Distractors (`exercises/distractors/[word].json`)
```json
[
  "incorrect definition 1",
  "incorrect definition 2", 
  "incorrect definition 3"
]
```

## Adding New Data

1. **New Words**: Add to `definitions/[language].json`
2. **Example Sentences**: Create `sentences/[word].json`
3. **Similar Words**: Create `similar-words/[word].json`
4. **Distractors**: Create `exercises/distractors/[word].json`
5. **Context Templates**: Add to `exercises/templates/[context].json`

## Context Categories

Common context categories used throughout the data:
- `business` - Business and professional terminology
- `daily` - Everyday conversation and activities
- `technology` - Tech and computer-related terms
- `sports` - Athletic and recreational activities
- `geography` - Places, locations, and physical features
- `politics` - Government and political terms
- `academic` - Educational and scholarly vocabulary

## Data Management

The `ManualDataService` loads all this data into memory at startup for fast access. Use the admin interface (when implemented) to add/edit data, or manually edit these JSON files and restart the server.