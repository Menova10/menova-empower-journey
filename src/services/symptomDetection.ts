import { symptoms } from '@/types/symptoms';

export function detectSymptoms(text: string) {
  const detectedSymptoms = new Set<string>();
  let primarySymptom: string | null = null;
  let intensity: number | null = null;

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();

  // First pass: Look for exact symptom matches and common variations
  symptoms.forEach(symptom => {
    // Check for exact symptom name or ID
    const matchTerms = [
      symptom.name.toLowerCase(),
      symptom.id,
      symptom.id.replace(/_/g, ' '), // Convert ID format to space-separated
      symptom.name.toLowerCase().replace(/\s+/g, '') // Remove spaces
    ];

    if (matchTerms.some(term => lowerText.includes(term))) {
      detectedSymptoms.add(symptom.id);
      if (!primarySymptom) {
        primarySymptom = symptom.id;
      }
    }
  });

  // Second pass: Look for intensity indicators
  const intensityMatches = lowerText.match(/(\d+)(?:\s*\/\s*5|\s+out\s+of\s+5)/i) ||
    lowerText.match(/(?:intensity|level|rating|score)\s*(?:of|is|:|=)\s*(\d+)/i);

  if (intensityMatches) {
    const value = parseInt(intensityMatches[1]);
    if (value >= 1 && value <= 5) {
      intensity = value;
    }
  } else {
    // Look for descriptive intensity words
    const intensityWords = {
      mild: 2,
      moderate: 3,
      severe: 4,
      extreme: 5,
      slight: 1,
      little: 1,
      very: 4,
      really: 4,
      extremely: 5,
      barely: 1,
      hardly: 1,
      quite: 3,
      somewhat: 2,
      particularly: 4,
      incredibly: 5,
      terribly: 5
    };

    for (const [word, value] of Object.entries(intensityWords)) {
      if (lowerText.includes(word)) {
        intensity = value;
        break;
      }
    }
  }

  // If no intensity was found but we have symptoms, default to moderate
  if (detectedSymptoms.size > 0 && intensity === null) {
    intensity = 3; // Default to moderate intensity
  }

  return {
    detectedSymptoms,
    primarySymptom,
    intensity
  };
}

export function extractMoodAndIntensity(text: string) {
  const moodWords = {
    happy: ['happy', 'joyful', 'excited', 'delighted', 'cheerful', 'content'],
    sad: ['sad', 'depressed', 'down', 'unhappy', 'gloomy', 'miserable'],
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'uneasy'],
    angry: ['angry', 'frustrated', 'irritated', 'annoyed', 'mad', 'furious'],
    neutral: ['okay', 'fine', 'neutral', 'normal', 'average']
  };

  const lowerText = text.toLowerCase();
  let detectedMood: string | null = null;
  let intensity: number | null = null;

  // Detect mood
  for (const [mood, words] of Object.entries(moodWords)) {
    if (words.some(word => lowerText.includes(word))) {
      detectedMood = mood;
      break;
    }
  }

  // Detect intensity using the same logic as symptom intensity
  const intensityMatches = lowerText.match(/(\d+)(?:\s*\/\s*5|\s+out\s+of\s+5)/i) ||
    lowerText.match(/(?:intensity|level|rating|score)\s*(?:of|is|:|=)\s*(\d+)/i);

  if (intensityMatches) {
    const value = parseInt(intensityMatches[1]);
    if (value >= 1 && value <= 5) {
      intensity = value;
    }
  } else {
    const intensityWords = {
      mild: 2,
      moderate: 3,
      severe: 4,
      extreme: 5,
      slight: 1,
      little: 1,
      very: 4,
      really: 4,
      extremely: 5,
      barely: 1,
      hardly: 1,
      quite: 3,
      somewhat: 2,
      particularly: 4,
      incredibly: 5,
      terribly: 5
    };

    for (const [word, value] of Object.entries(intensityWords)) {
      if (lowerText.includes(word)) {
        intensity = value;
        break;
      }
    }
  }

  return {
    detectedMood,
    intensity: intensity || 3 // Default to medium intensity if not specified
  };
} 