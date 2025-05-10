
export interface Goal {
  id: string;
  goal: string;
  completed: boolean;
  category: string;
  date?: string;
}

export interface SuggestedGoal {
  text: string;
  category: string;
}

export interface CategoryProgress {
  [key: string]: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export interface WeeklyProgress {
  [key: string]: {
    [category: string]: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

export interface MonthlyProgress {
  [key: string]: {
    [category: string]: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

export const motivationalMessages = [
  "Amazing job! You're taking great care of yourself.",
  "Fantastic work! Keep nurturing your wellbeing.",
  "Well done! Every step matters on your wellness journey.",
  "Great achievement! You're making wonderful progress.",
  "Excellent! Your dedication to self-care is inspiring."
];

// Improved categories with icons and colors
export const categories = [
  { value: 'nourish', label: 'Nourish', icon: 'Apple', color: 'bg-orange-200 text-orange-700' },
  { value: 'center', label: 'Center', icon: 'Brain', color: 'bg-teal-200 text-teal-700' },
  { value: 'play', label: 'Play', icon: 'ActivitySquare', color: 'bg-red-200 text-red-700' },
  { value: 'general', label: 'General', icon: 'Plus', color: 'bg-gray-200 text-gray-700' },
];

// Helper function to normalize category names for consistency
export const normalizeCategory = (category: string): string => {
  // Convert to lowercase for consistency
  const lowerCategory = category.toLowerCase();
  
  // Map 'centre' to 'center' for consistency
  if (lowerCategory === 'centre') return 'center';
  
  return lowerCategory;
};
