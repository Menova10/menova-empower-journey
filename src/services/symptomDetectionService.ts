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

  // Convert text to lowercase and normalize spaces
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();

  // Check for numeric ratings first (e.g., "3/5", "level 4", etc.)
  const intensityRegex = /(\d)[\/\s]5|(\d)\s*out\s*of\s*5|level\s*(\d)|rating\s*(\d)|intensity\s*(\d)/i;
  const match = normalizedText.match(intensityRegex);
  if (match) {
    const numericIntensity = parseInt(match[1] || match[2] || match[3] || match[4] || match[5]);
    if (numericIntensity >= 1 && numericIntensity <= 5) {
      intensity = numericIntensity;
    }
  }

  // Check for intensity words if no numeric rating found
  if (intensity === null) {
    if (normalizedText.includes('severe') || normalizedText.includes('really bad') || normalizedText.includes('extreme')) {
      intensity = 5; // Severe
    } else if (normalizedText.includes('quite bad') || normalizedText.includes('very')) {
      intensity = 4; // Quite severe
    } else if (normalizedText.includes('moderate') || normalizedText.includes('medium')) {
      intensity = 3; // Moderate
    } else if (normalizedText.includes('mild') || normalizedText.includes('slight')) {
      intensity = 2; // Mild
    } else if (normalizedText.includes('very mild') || normalizedText.includes('barely')) {
      intensity = 1; // Very mild
    }
  }

  // Check for general mentions of "everything" or "all symptoms"
  const hasGeneralSymptoms = generalSymptomsKeywords.some(keyword => 
    normalizedText.includes(keyword)
  );
  
  if (hasGeneralSymptoms) {
    // Add all symptom types with consistent IDs
    Object.keys(symptomKeywords).forEach(symptom => {
      const normalizedId = symptom.toLowerCase().replace(/\s+/g, '_');
      detectedSymptoms.add(normalizedId);
    });
  } else {
    // Check each symptom type with improved matching
    Object.entries(symptomKeywords).forEach(([symptomId, keywords]) => {
      const normalizedId = symptomId.toLowerCase().replace(/\s+/g, '_');
      
      // Check for exact keyword matches first
      if (keywords.some(keyword => normalizedText.includes(keyword.toLowerCase()))) {
        detectedSymptoms.add(normalizedId);
        return; // Skip to next symptom if we found a match
      }
      
      // Check for multi-word matches with better accuracy
      const hasMultiWordMatch = keywords.some(keyword => {
        const words = keyword.toLowerCase().split(' ');
        return words.length > 1 && words.every(word => 
          word.length > 2 && normalizedText.includes(word)
        );
      });
      
      if (hasMultiWordMatch) {
        detectedSymptoms.add(normalizedId);
      }
    });
  }
  
  // If we've detected any symptoms, use the first one as primary
  if (detectedSymptoms.size > 0) {
    primarySymptom = Array.from(detectedSymptoms)[0];
  }
  
  // If we have symptoms but no intensity, default to moderate
  if (detectedSymptoms.size > 0 && intensity === null) {
    intensity = 3;
  }
  
  console.log('Symptom detection results:', {
    text: normalizedText,
    detectedSymptoms: Array.from(detectedSymptoms),
    primarySymptom,
    intensity
  });
  
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