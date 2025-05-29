import { categories } from "./wellness";

// Symptom definitions with colors - UPDATED with more accessible colors
export const symptoms = [
  { id: 'hot_flashes', name: 'Hot Flashes', color: '#F97316', tip: 'Try a cooling breath exercise: inhale for 4 seconds, hold for 4, exhale for 6.' }, // Bright orange for hot flashes
  { id: 'sleep', name: 'Sleep Quality', color: '#2E8540', tip: 'Create a calming bedtime routine with dim lights and gentle stretching 30 minutes before sleep.' },
  { id: 'mood', name: 'Mood', color: '#9C27B0', tip: 'Practice mindful breathing for 5 minutes when you feel your mood shifting.' },
  { id: 'energy', name: 'Energy Level', color: '#FEC6A1', tip: 'Short 10-minute walks in nature can help boost energy levels naturally.' }, // Soft orange for energy
  { id: 'anxiety', name: 'Anxiety', color: '#FEF7CD', tip: 'Try the 5-4-3-2-1 grounding technique: acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.' }, // Soft yellow for anxiety
  { id: 'brain_fog', name: 'Brain Fog', color: '#FFB74D', tip: 'Try doing one task at a time and taking short breaks to reset your focus.' }, // Amber for brain fog
  { id: 'headache', name: 'Headache', color: '#E57373', tip: 'Try a cold compress on your forehead and staying hydrated throughout the day.' } // Red for headache
];

// Source badges with styling
export const sourceBadges = {
  manual: { label: 'SYMPTOM TRACKER', class: 'bg-menova-green text-white' },
  daily_checkin: { label: 'DAILY CHECKIN', class: 'bg-menova-softpink text-gray-800' },
  chat: { label: 'CHAT', class: 'bg-[#d9b6d9] text-gray-800' },
  voice_assistant: { label: 'VOICE', class: 'bg-menova-softpeach text-gray-800' },
  voice_auto: { label: 'AUTO-DETECTED', class: 'bg-yellow-200 text-yellow-800' },
  notes: { label: 'NOTES', class: 'bg-blue-100 text-blue-800' },
};

// Time period definitions
export const timePeriods = [
  { id: 'daily', name: 'Today', 
    getRange: () => {
      const today = new Date();
      return { start: today, end: today };
    } 
  },
  { id: 'weekly', name: 'This Week',
    getRange: () => {
      const today = new Date();
      return { 
        start: startOfWeek(today, { weekStartsOn: 1 }), 
        end: endOfWeek(today, { weekStartsOn: 1 }) 
      };
    }
  },
  { id: 'monthly', name: 'This Month',
    getRange: () => {
      const today = new Date();
      return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  },
  { id: '3months', name: 'Last 3 Months',
    getRange: () => {
      const today = new Date();
      return { start: subDays(today, 90), end: today };
    }
  }
];

// Define TypeScript interfaces for symptom data
export interface SymptomEntry {
  id: string;
  symptom: string;
  intensity: number;
  source: string;
  recorded_at: string;
  notes?: string | null;
  user_id: string;
}

export interface SymptomAggregation {
  sum: number;
  count: number;
  rawDate?: Date; // Added for proper date sorting
}

export interface GroupedSymptoms {
  [date: string]: {
    [symptom: string]: SymptomAggregation;
  };
}

export interface ChartDataPoint {
  date: string;
  rawDate?: Date; // Added for proper date sorting
  [symptom: string]: number | string | Date | undefined;
}

import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Helper to get symptom color as CSS value
export const getSymptomColor = (symptomId: string): string => {
  const symptom = symptoms.find(s => s.id === symptomId);
  if (!symptom) return '#F97316'; // Default to accessible orange
  
  return symptom.color || 
    symptomId === 'hot_flashes' ? '#F97316' :  // Bright orange
    symptomId === 'sleep' ? '#2E8540' :        // Accessible green
    symptomId === 'mood' ? '#9C27B0' :         // Accessible purple
    symptomId === 'energy' ? '#FEC6A1' :       // Soft orange
    symptomId === 'anxiety' ? '#FEF7CD' :      // Soft yellow
    symptomId === 'brain_fog' ? '#FFB74D' :    // Amber
    '#F97316';                                 // Default orange
};
