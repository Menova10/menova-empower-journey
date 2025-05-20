import { symptoms } from '@/types/symptoms';

/**
 * This service provides unified symptom detection capabilities
 * that can be used across different input methods in the app
 * (voice, chat, symptom tracking, etc.)
 */

// Define keywords for each symptom type with more variations
export const symptomKeywords = {
  hot_flashes: ['hot flash', 'hot flashes', 'sweating', 'heat', 'burning', 'flush', 'flushing', 'overheated', 'burning up', 'warm', 'perspiration', 'hot', 'flashes', 'temperature', 'overheating'],
  sleep: ['sleep', 'insomnia', 'tired', 'fatigue', 'rest', 'wake up', 'waking', 'night sweat', 'night sweats', "can't sleep", "trouble sleeping", "difficulty sleeping", "restless", "tossing and turning", "sleep quality", "waking up"],
  mood: ['mood', 'irritable', 'anxiety', 'anxious', 'depressed', 'depression', 'sad', 'angry', 'emotional', 'moody', 'irritability', 'feeling down', 'blue', 'mood swings', 'feeling low', 'emotional changes', 'mood changes'],
  energy: ['energy', 'tired', 'exhausted', 'fatigue', 'lethargy', 'motivation', 'vigor', 'no energy', 'exhaustion', 'drained', 'worn out', 'no stamina', 'sluggish', 'energy level', 'vitality'],
  brain_fog: ['brain fog', 'forgetful', 'memory', 'concentration', 'focus', 'confused', 'forget', 'foggy', 'unclear thinking', 'fuzzy', 'can\'t think clearly', 'absent-minded', 'memory issues', 'cognitive', 'forgetfulness'],
  anxiety: ['anxiety', 'anxious', 'worried', 'stress', 'stressed', 'panic', 'nervous', 'worry', 'on edge', 'tense', 'unsettled', 'uneasy', 'restless', 'stressed out', 'anxious feelings', 'stress level'],
  headache: ['headache', 'migraine', 'head pain', 'head ache', 'throbbing head', 'pounding head', 'pain in my head', 'head hurts', 'hurts my head', 'tension headache', 'skull pain', 'cranial pain', 'sinus pain', 'head pressure', 'head throbbing', 'pounding in head', 'head pounding', 'pulsing in head', 'head discomfort']
};

// Check for "everything" or "all symptoms" keywords
export const generalSymptomsKeywords = [
  'everything', 'all symptoms', 'every symptom', 
  'all of them', 'all of the above', 'many symptoms', 
  'lots of symptoms', 'multiple symptoms', 'several symptoms',
  'all my symptoms', 'everything hurts', 'everything is bad', 
  'many issues', 'many problems'
];

/**
 * Analyzes text for mentions of symptoms and returns detected symptoms
 */
export function detectSymptoms(text: string): { 
  detectedSymptoms: Set<string>; 
  primarySymptom: string | null;
  intensity: number | null;
} {
  const detectedSymptoms = new Set<string>();
  let primarySymptom: string | null = null;
  let intensity: number | null = null;

  // Check for numeric ratings (e.g., "3/5", "level 4", etc.)
  const intensityRegex = /(\d)[\/\s]5|(\d)\s*out\s*of\s*5|level\s*(\d)|rating\s*(\d)|intensity\s*(\d)/i;
  const match = text.toLowerCase().match(intensityRegex);
  if (match) {
    const numericIntensity = parseInt(match[1] || match[2] || match[3] || match[4] || match[5]);
    if (numericIntensity >= 1 && numericIntensity <= 5) {
      intensity = numericIntensity;
    }
  } else {
    // Check for intensity words and convert to 1-5 scale
    if (text.toLowerCase().includes('severe') || text.toLowerCase().includes('really bad') || text.toLowerCase().includes('extreme')) {
      intensity = 5; // Severe
    } else if (text.toLowerCase().includes('quite bad') || text.toLowerCase().includes('very')) {
      intensity = 4; // Quite severe
    } else if (text.toLowerCase().includes('moderate') || text.toLowerCase().includes('medium')) {
      intensity = 3; // Moderate
    } else if (text.toLowerCase().includes('mild') || text.toLowerCase().includes('slight')) {
      intensity = 2; // Mild
    } else if (text.toLowerCase().includes('very mild') || text.toLowerCase().includes('barely')) {
      intensity = 1; // Very mild
    }
  }

  // Convert to array if single string is provided
  const textArray = Array.isArray(text) ? text : [text];
  const lowerTextArray = textArray.map(t => t.toLowerCase());
  
  // Check for general mentions of "everything" or "all symptoms"
  const hasGeneralSymptoms = lowerTextArray.some(text => 
    generalSymptomsKeywords.some(keyword => text.includes(keyword))
  );
  
  if (hasGeneralSymptoms) {
    // Add all symptom types
    Object.keys(symptomKeywords).forEach(symptom => detectedSymptoms.add(symptom));
  } else {
    // More sensitive detection - check each symptom type with partial matching
    Object.entries(symptomKeywords).forEach(([symptomId, keywords]) => {
      // Check for exact keyword matches first
      for (const text of lowerTextArray) {
        if (keywords.some(keyword => text.includes(keyword))) {
          detectedSymptoms.add(symptomId);
          continue; // Skip to next symptom if we found a match
        }
        
        // If no exact match, try word-boundary matches for better detection
        if (keywords.some(keyword => {
          const words = keyword.split(' ');
          return words.length > 1 && words.every(word => text.includes(word) && word.length > 3);
        })) {
          detectedSymptoms.add(symptomId);
        }
      }
    });
  }
  
  // If we've detected any symptoms, use the first one as primary
  if (detectedSymptoms.size > 0) {
    primarySymptom = Array.from(detectedSymptoms)[0];
  }
  
  return {
    detectedSymptoms,
    primarySymptom,
    intensity
  };
}

/**
 * Formats detected symptoms for display or storage
 */
export function formatDetectedSymptoms(detectedSymptoms: Set<string>): string {
  if (detectedSymptoms.size === 0) {
    return 'None specifically identified';
  }
  
  return Array.from(detectedSymptoms).map(s => {
    const symptom = symptoms.find(sym => sym.id === s);
    return symptom ? symptom.name : s;
  }).join(', ');
}

/**
 * Converts intensity number to descriptive text
 */
export function intensityToDescription(intensity: number | null): string {
  if (!intensity) return 'unknown';
  switch (intensity) {
    case 5: return 'severe (5/5)';
    case 4: return 'quite severe (4/5)';
    case 3: return 'moderate (3/5)';
    case 2: return 'mild (2/5)';
    case 1: return 'very mild (1/5)';
    default: return 'unknown';
  }
}

/**
 * Creates an enhanced summary of a conversation with detected symptoms
 */
export function createEnhancedSummary(
  summary: string, 
  detectedSymptoms: Set<string>, 
  intensity: number | null
): string {
  return `DETECTED SYMPTOMS: ${formatDetectedSymptoms(detectedSymptoms)}
INTENSITY: ${intensity ? `${intensity}/5 (${intensityToDescription(intensity)})` : 'Not specified'}

${summary}`;
}

/**
 * Creates a descriptive title based on detected symptoms
 */
export function createSymptomTitle(detectedSymptoms: Set<string>): string {
  if (detectedSymptoms.size === 0) {
    return 'General wellness conversation';
  }
  
  return `Conversation about ${Array.from(detectedSymptoms).map(s => {
    const symptom = symptoms.find(sym => sym.id === s);
    return symptom ? symptom.name.toLowerCase() : s;
  }).join(', ')}`;
} 