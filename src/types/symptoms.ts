
import { categories } from "./wellness";

// Symptom definitions with colors
export const symptoms = [
  { id: 'hot_flashes', name: 'Hot Flashes', color: 'bg-menova-softpink', tip: 'Try a cooling breath exercise: inhale for 4 seconds, hold for 4, exhale for 6.' },
  { id: 'sleep', name: 'Sleep Quality', color: 'bg-menova-green', tip: 'Create a calming bedtime routine with dim lights and gentle stretching 30 minutes before sleep.' },
  { id: 'mood', name: 'Mood', color: 'bg-[#d9b6d9]', tip: 'Practice mindful breathing for 5 minutes when you feel your mood shifting.' },
  { id: 'energy', name: 'Energy Level', color: 'bg-menova-softpeach', tip: 'Short 10-minute walks in nature can help boost energy levels naturally.' },
  { id: 'anxiety', name: 'Anxiety', color: 'bg-[#b1cfe6]', tip: 'Try the 5-4-3-2-1 grounding technique: acknowledge 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.' }
];

// Source badges with styling
export const sourceBadges = {
  manual: { label: 'SYMPTOM TRACKER', class: 'bg-menova-green text-white' },
  daily_checkin: { label: 'DAILY CHECKIN', class: 'bg-menova-softpink text-gray-800' },
  chat: { label: 'CHAT', class: 'bg-[#d9b6d9] text-gray-800' },
  voice: { label: 'VOICE', class: 'bg-menova-softpeach text-gray-800' },
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
}

export interface GroupedSymptoms {
  [date: string]: {
    [symptom: string]: SymptomAggregation;
  };
}

export interface ChartDataPoint {
  date: string;
  [symptom: string]: number | string;
}

import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Helper to get symptom color as CSS value
export const getSymptomColor = (symptomId: string): string => {
  const symptom = symptoms.find(s => s.id === symptomId);
  if (!symptom) return '#A5D6A7';
  
  return symptom.color.replace('bg-', '').startsWith('#') 
    ? symptom.color.replace('bg-', '') 
    : symptomId === 'sleep' ? '#A5D6A7' 
    : symptomId === 'hot_flashes' ? '#FFDEE2'
    : symptomId === 'mood' ? '#d9b6d9'
    : symptomId === 'energy' ? '#FDE1D3'
    : '#b1cfe6';
};
