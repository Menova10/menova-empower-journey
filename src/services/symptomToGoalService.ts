import { supabase } from '@/integrations/supabase/client';

export interface SymptomGoalMapping {
  symptom: string;
  goals: string[];
  category: string;
  priority: number;
}

// Comprehensive symptom to goal mapping
export const symptomGoalMappings: SymptomGoalMapping[] = [
  // Hot Flashes
  {
    symptom: 'hot flash',
    goals: [
      'Keep a cooling fan nearby for instant relief',
      'Drink a glass of cold water when feeling warm',
      'Practice deep breathing for 2 minutes during hot flashes',
      'Wear breathable, layered clothing today'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'hot flush',
    goals: [
      'Take cool showers when feeling overheated',
      'Use a cooling towel on neck and wrists',
      'Avoid spicy foods and caffeine today'
    ],
    category: 'nourish',
    priority: 1
  },

  // Sleep Issues
  {
    symptom: 'insomnia',
    goals: [
      'Create a cool, dark sleep environment',
      'Practice 10 minutes of evening meditation',
      'Avoid screens 1 hour before bedtime',
      'Try chamomile tea before sleep'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'sleep problem',
    goals: [
      'Establish a consistent bedtime routine',
      'Take a warm bath with lavender before bed',
      'Write in a gratitude journal before sleep'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'night sweat',
    goals: [
      'Use moisture-wicking sleepwear tonight',
      'Keep a cold water bottle by the bed',
      'Sleep with a fan on low setting'
    ],
    category: 'center',
    priority: 1
  },

  // Mood Changes
  {
    symptom: 'anxiety',
    goals: [
      'Practice 5 minutes of mindful breathing',
      'Take a 15-minute walk in nature',
      'Listen to calming music for 10 minutes',
      'Call a supportive friend or family member'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'stressed',
    goals: [
      'Try progressive muscle relaxation',
      'Take 3 deep breaths when feeling overwhelmed',
      'Spend 5 minutes in gentle stretching'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'mood swing',
    goals: [
      'Track mood patterns in a journal',
      'Practice self-compassion meditation',
      'Engage in a favorite creative activity'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'irritable',
    goals: [
      'Take 5 minutes alone to reset',
      'Practice gentle yoga or stretching',
      'Write down thoughts and feelings'
    ],
    category: 'center',
    priority: 1
  },

  // Physical Symptoms
  {
    symptom: 'fatigue',
    goals: [
      'Take a 20-minute power nap if possible',
      'Eat iron-rich foods like spinach or lentils',
      'Take a gentle 10-minute walk outside',
      'Drink an extra glass of water'
    ],
    category: 'nourish',
    priority: 1
  },
  {
    symptom: 'tired',
    goals: [
      'Prioritize one important task and rest',
      'Have a healthy snack with protein',
      'Practice gentle movement or stretching'
    ],
    category: 'nourish',
    priority: 1
  },
  {
    symptom: 'headache',
    goals: [
      'Apply a cold compress to forehead',
      'Drink a large glass of water',
      'Rest in a quiet, dark room for 15 minutes',
      'Gently massage temples and neck'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'joint pain',
    goals: [
      'Apply heat or cold therapy as needed',
      'Do gentle range-of-motion exercises',
      'Take anti-inflammatory foods like turmeric'
    ],
    category: 'nourish',
    priority: 1
  },

  // Cognitive Symptoms
  {
    symptom: 'brain fog',
    goals: [
      'Organize tasks in a simple to-do list',
      'Take regular breaks every 30 minutes',
      'Eat omega-3 rich foods like salmon or walnuts',
      'Practice memory exercises or puzzles'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'forgetful',
    goals: [
      'Use phone reminders for important tasks',
      'Write things down immediately',
      'Practice mindfulness to improve focus'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'concentration',
    goals: [
      'Work in focused 25-minute intervals',
      'Eliminate distractions from workspace',
      'Take deep breaths before starting tasks'
    ],
    category: 'center',
    priority: 1
  },

  // General Wellness
  {
    symptom: 'overwhelmed',
    goals: [
      'Break large tasks into smaller steps',
      'Practice saying no to non-essential commitments',
      'Schedule 30 minutes of self-care time',
      'Connect with a supportive person'
    ],
    category: 'center',
    priority: 1
  },
  {
    symptom: 'emotional',
    goals: [
      'Allow yourself to feel emotions without judgment',
      'Practice gentle self-care activities',
      'Journal about your feelings',
      'Seek support from loved ones if needed'
    ],
    category: 'center',
    priority: 1
  }
];

// Function to detect symptoms in conversation text
export const detectSymptomsInText = (text: string): SymptomGoalMapping[] => {
  const lowerText = text.toLowerCase();
  const detectedMappings: SymptomGoalMapping[] = [];
  
  symptomGoalMappings.forEach(mapping => {
    if (lowerText.includes(mapping.symptom.toLowerCase())) {
      detectedMappings.push(mapping);
    }
  });
  
  // Sort by priority (higher priority first)
  return detectedMappings.sort((a, b) => b.priority - a.priority);
};

// Function to convert detected symptoms into actionable goals
export const createGoalsFromSymptoms = async (
  userId: string, 
  conversationText: string
): Promise<{ createdGoals: any[], symptomsDetected: string[] }> => {
  const detectedMappings = detectSymptomsInText(conversationText);
  
  if (detectedMappings.length === 0) {
    return { createdGoals: [], symptomsDetected: [] };
  }
  
  const createdGoals: any[] = [];
  const symptomsDetected: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Create up to 3 goals from the most relevant symptoms
  for (let i = 0; i < Math.min(detectedMappings.length, 2); i++) {
    const mapping = detectedMappings[i];
    symptomsDetected.push(mapping.symptom);
    
    // Select 1-2 goals from each symptom mapping
    const selectedGoals = mapping.goals.slice(0, 2);
    
    for (const goalText of selectedGoals) {
      try {
        // Check if similar goal already exists for today
        const { data: existingGoals } = await supabase
          .from('daily_goals')
          .select('goal')
          .eq('user_id', userId)
          .eq('date', today)
          .ilike('goal', `%${goalText.substring(0, 20)}%`);
        
        if (!existingGoals || existingGoals.length === 0) {
          const { data: newGoal, error } = await supabase
            .from('daily_goals')
            .insert({
              user_id: userId,
              goal: goalText,
              category: mapping.category,
              date: today,
              completed: false,
              source: 'voice_symptom_auto'
            })
            .select()
            .single();
          
          if (!error && newGoal) {
            createdGoals.push(newGoal);
          }
        }
      } catch (error) {
        console.error('Error creating goal from symptom:', error);
      }
    }
  }
  
  return { createdGoals, symptomsDetected };
};

// Function to get motivational message for symptom
export const getSymptomMotivationalMessage = (symptoms: string[]): string => {
  if (symptoms.length === 0) return '';
  
  const messages = [
    "I understand you're going through this. Let me suggest some gentle ways to help you feel better. 💙",
    "You're not alone in this journey. Here are some caring steps we can take together. 🌸",
    "I hear you, and I'm here to help. Let's create some supportive goals for today. 🤗",
    "Thank you for sharing how you're feeling. Let me help you with some nurturing activities. 🌿",
    "Your wellness matters. I've added some gentle goals to help you through this. ✨"
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}; 